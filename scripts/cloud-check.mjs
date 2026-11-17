// Deployment smoke/recovery check, separate from the five local INT scenarios.
import { chromium, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { signup, login, create, edit } from '../e2e/harness.js';
const [mode, origin] = process.argv.slice(2);
if (!['baseline', 'recovery', 'outage'].includes(mode) || !/^https:\/\/[a-z0-9.-]+\.vercel\.app$/.test(origin || ''))
  throw new Error('Usage: node scripts/cloud-check.mjs baseline|outage|recovery https://project.vercel.app');
mkdirSync('evidence/local', { recursive: true });
mkdirSync('evidence/production', { recursive: true });
const statePath = 'evidence/local/cloud-state.json';
const state = mode === 'baseline' ? { origin, email: `cloud-${Date.now()}@example.test`, password: randomBytes(24).toString('base64url') }
  : JSON.parse(readFileSync(statePath, 'utf8'));
if (state.origin !== origin) throw new Error('Deployment origin differs from baseline');
const browser = await chromium.launch();
const page = await browser.newPage({ baseURL: origin, viewport: { width: 1280, height: 900 } });
const result = { mode, origin, at: new Date().toISOString(), checks: [] };
try {
  const health = await page.request.get('/api/health', { timeout: 25000 });
  result.health = health.status();
  if (mode === 'outage') {
    expect(health.ok()).toBeFalsy();
    await page.goto('/');
    await expect(page.getByRole('alert')).toBeVisible();
    result.checks.push('API unavailable; UI displays connection error');
  } else {
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ status: 'UP' });
    if (mode === 'baseline') await signup(page, state);
    await login(page, state);
    const user = await (await page.request.get('/api/auth/me')).json();
    const cookies = await page.context().cookies();
    const session = cookies.find(c => c.name === 'JSESSIONID');
    expect(session?.httpOnly).toBe(true); expect(session?.secure).toBe(true);
    result.checks.push('HTTPS health, login, HttpOnly/Secure session, CSRF write flow');
    if (mode === 'baseline') {
      state.memberId = user.id;
      const saved = await create(page, { title: '배포 복구 검증용 이야기', body: '서비스가 재시작되어도 이 글과 작성자가 유지되어야 합니다.' });
      expect(saved.authorId).toBe(user.id);
      await edit(page, { title: '배포 복구 검증용 이야기', body: '수정한 내용도 재시작 뒤 유지됩니다.' });
      state.post = await (await page.request.get(`/api/posts/${saved.id}`)).json();
      writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
      result.checks.push('Synthetic account, create/read/update, author linkage');
    } else {
      expect(user.id).toBe(state.memberId);
      const saved = await (await page.request.get(`/api/posts/${state.post.id}`)).json();
      expect(saved).toEqual(state.post);
      await page.goto(`/?post=${saved.id}`);
      await expect(page.getByTestId('post-body')).toHaveText(state.post.body);
      await edit(page, { title: saved.title, body: '장애 복구 후에도 정상적으로 수정됩니다.' });
      result.checks.push('Same member and post IDs, persisted edit/author, successful write after recovery');
    }
    await page.getByRole('button', { name: '로그아웃' }).click();
    await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
    expect((await page.request.get('/api/auth/me')).status()).toBe(401);
    result.checks.push('Logout invalidates current session');
  }
  await page.screenshot({ path: `evidence/production/${mode}.png`, fullPage: true });
  result.status = 'passed';
} catch (error) {
  result.status = 'failed'; result.error = error.message;
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync(`evidence/production/${mode}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
