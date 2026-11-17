import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect } from '@playwright/test';
let processHandle, dbUrl, log = '', dir;
export async function start(fresh = true) {
  if (fresh) { dir = mkdtempSync(join(tmpdir(), 'board-int-')); dbUrl = `jdbc:h2:file:${dir}/board;AUTO_SERVER=TRUE`; }
  log = '';
  processHandle = spawn('java', ['-jar', 'backend/build/libs/board.jar'], {
    env: { ...process.env, PORT: '18080', APP_DB_URL: dbUrl }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  processHandle.stdout.on('data', chunk => { log += chunk; });
  processHandle.stderr.on('data', chunk => { log += chunk; });
  for (let i = 0; i < 120; i++) {
    if (processHandle.exitCode !== null) throw new Error(`Server exited: ${log}`);
    try { await fetch('http://127.0.0.1:18080/api/posts'); return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Server startup timeout: ${log}`);
}
export async function stop() {
  if (!processHandle || processHandle.exitCode !== null) return;
  const p = processHandle;
  await new Promise((resolveStop, reject) => {
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('Server stop timeout')); }, 10000);
    p.once('exit', () => { clearTimeout(timer); resolveStop(); });
    p.kill('SIGTERM');
  });
}
export function snapshot() {
  return execFileSync('java', ['-cp', 'backend/build/tools/h2.jar', 'org.h2.tools.Shell',
    '-url', dbUrl, '-user', 'sa', '-password', '', '-sql',
    'SELECT id,email FROM members ORDER BY email; SELECT id,author_id,title,body FROM posts ORDER BY id;'], { encoding: 'utf8' });
}
export async function evidence(info) {
  mkdirSync('evidence/local', { recursive: true });
  const data = snapshot();
  const id = info.title.split(' ')[0];
  writeFileSync(`evidence/local/${id}-storage.txt`, data);
  await info.attach('storage', { body: data, contentType: 'text/plain' });
}
export const A = { email: 'board-a@example.test', password: 'BoardOnly!2026_A' };
export const B = { email: 'board-b@example.test', password: 'BoardOnly!2026_B' };
export const P1 = { title: '첫 번째 글', body: '안녕하세요.\n게시판 테스트입니다.' };
export const P2 = { title: '두 번째 글', body: '다른 회원의 글입니다.' };
export const P3 = { title: '세 번째 글', body: '새로고침 후에도 남아야 합니다.' };
export async function api(request, method, path, data) {
  const csrfResponse = await request.get('/api/csrf');
  const csrf = await csrfResponse.json();
  return request.fetch(`/api${path}`, { method, data, headers: { [csrf.headerName]: csrf.token } });
}
export async function signup(page, user) {
  await page.goto('/');
  await page.getByRole('button', { name: '회원가입', exact: true }).click();
  await page.getByLabel('이메일').fill(user.email);
  await page.getByLabel('비밀번호').fill(user.password);
  await page.getByRole('button', { name: '가입하기', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('가입');
}
export async function login(page, user) {
  await page.goto('/');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.getByLabel('이메일').fill(user.email);
  await page.getByLabel('비밀번호').fill(user.password);
  await page.getByRole('button', { name: '로그인하기', exact: true }).click();
  await expect(page.getByTestId('current-user')).toHaveText(user.email);
}
export async function create(page, post) {
  await page.getByRole('button', { name: '글 쓰기', exact: true }).click();
  await page.getByLabel('제목', { exact: true }).fill(post.title);
  await page.getByLabel('본문', { exact: true }).fill(post.body);
  const response = page.waitForResponse(r => r.url().endsWith('/api/posts') && r.request().method() === 'POST');
  await page.getByRole('button', { name: '게시하기' }).click();
  const r = await response; expect(r.status()).toBe(201);
  const saved = await r.json();
  await expect(page.getByRole('heading', { name: post.title, exact: true })).toBeVisible();
  return saved;
}
export async function edit(page, post) {
  await page.getByRole('button', { name: '수정', exact: true }).click();
  await page.getByLabel('제목', { exact: true }).fill(post.title);
  await page.getByLabel('본문', { exact: true }).fill(post.body);
  await page.getByRole('button', { name: '수정 저장' }).click();
  await expect(page.getByRole('heading', { name: post.title, exact: true })).toBeVisible();
}
export async function remove(page) {
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('button', { name: '삭제 확인', exact: true }).click();
  await expect(page.getByRole('heading', { name: '함께 나누는 이야기' })).toBeVisible();
}
