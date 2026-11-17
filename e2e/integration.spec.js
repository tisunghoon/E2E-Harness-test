import { test, expect } from '@playwright/test';
import { start, stop, snapshot, evidence, A, B, P1, P2, P3, api, signup, login, create, edit, remove } from './harness.js';
test.beforeEach(async () => { await start(); });
test.afterEach(async ({}, info) => {
  try { await evidence(info); } finally { await stop(); }
});

test('INT-01 회원 생성부터 공개 조회·수정·삭제까지 연결된다', async ({ page, browser }) => {
  await signup(page, A); await login(page, A);
  const me = await (await page.request.get('/api/auth/me')).json();
  const p = await create(page, P1);
  expect(p.authorId).toBe(me.id);
  const guest = await browser.newPage();
  await guest.goto(`/?post=${p.id}`);
  await expect(guest.getByTestId('post-body')).toHaveText(P1.body);
  await edit(page, { title: '수정한 첫 번째 글', body: '수정된 본문입니다.' });
  await guest.reload();
  await expect(guest.getByTestId('post-body')).toHaveText('수정된 본문입니다.');
  await remove(page);
  expect((await guest.request.get(`/api/posts/${p.id}`)).status()).toBe(404);
  expect(await (await guest.request.get('/api/posts')).json()).toEqual([]);
  expect(snapshot()).not.toContain(P1.title);
  await guest.close();
});

test('INT-02 타인 수정·삭제는 거절하고 각자 자신의 글만 수정한다', async ({ page, browser }) => {
  await signup(page, A); await login(page, A); const p1 = await create(page, P1);
  const b = await browser.newPage();
  await signup(b, B); await login(b, B); const p2 = await create(b, P2);
  const before = snapshot();
  expect((await api(b.request, 'PUT', `/posts/${p1.id}`, { title: '사칭', body: '사칭', authorId: p1.authorId })).status()).toBe(403);
  expect((await api(b.request, 'DELETE', `/posts/${p1.id}`)).status()).toBe(403);
  expect(snapshot().replace(/\(\d+ ms\)/g, '')).toBe(before.replace(/\(\d+ ms\)/g, ''));
  await edit(b, { title: 'B 수정', body: 'B 수정 본문' });
  await edit(page, { title: 'A 수정', body: 'A 수정 본문' });
  const posts = await (await page.request.get('/api/posts')).json();
  expect(posts.find(p => p.id === p1.id)).toMatchObject({ title: 'A 수정', authorId: p1.authorId });
  expect(posts.find(p => p.id === p2.id)).toMatchObject({ title: 'B 수정', authorId: p2.authorId });
  await b.close();
});

test('INT-03 로그아웃한 자격과 비회원 쓰기는 거절하고 재로그인은 허용한다', async ({ page, browser }) => {
  await signup(page, A); await login(page, A); const p = await create(page, P1);
  const oldState = await page.context().storageState();
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  const old = await browser.newContext({ storageState: oldState, baseURL: 'http://127.0.0.1:5173' });
  const guest = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' });
  const before = snapshot();
  for (const context of [old, guest]) {
    for (const [method, path, data] of [['POST', '/posts', P2], ['PUT', `/posts/${p.id}`, P2], ['DELETE', `/posts/${p.id}`]]) {
      expect((await api(context.request, method, path, data)).status()).toBe(401);
    }
    expect((await context.request.get(`/api/posts/${p.id}`)).status()).toBe(200);
  }
  expect(snapshot().replace(/\(\d+ ms\)/g, '')).toBe(before.replace(/\(\d+ ms\)/g, ''));
  await login(page, A); await page.goto(`/?post=${p.id}`);
  await edit(page, { title: '재로그인 수정', body: '정상 수정' });
  await old.close(); await guest.close();
});

test('INT-04 서버 재기동 후 계정·수정본·삭제·작성자 연결을 유지한다', async ({ page, browser }) => {
  await signup(page, A); await login(page, A); const p1 = await create(page, P1);
  const p3 = await create(page, P3); await remove(page);
  const b = await browser.newPage(); await signup(b, B); await login(b, B);
  const p2 = await create(b, P2); await edit(b, { title: '수정한 두 번째 글', body: '수정본 유지' });
  const before = snapshot();
  await stop(); await start(false);
  expect(snapshot().replace(/\(\d+ ms\)/g, '')).toBe(before.replace(/\(\d+ ms\)/g, ''));
  await login(page, A); await login(b, B);
  await page.goto(`/?post=${p1.id}`); await expect(page.getByTestId('post-body')).toHaveText(P1.body);
  await b.goto(`/?post=${p2.id}`); await expect(b.getByTestId('post-body')).toHaveText('수정본 유지');
  expect((await page.request.get(`/api/posts/${p3.id}`)).status()).toBe(404);
  const posts = await (await page.request.get('/api/posts')).json();
  expect(posts).toHaveLength(2);
  expect(posts.find(p => p.id === p1.id).authorId).toBe(p1.authorId);
  expect(posts.find(p => p.id === p2.id).authorId).toBe(p2.authorId);
  await b.close();
});

test('INT-05 중복 가입·잘못된 글 요청은 상태를 보존하고 이후 정상 처리가 된다', async ({ page }) => {
  await signup(page, A);
  expect((await api(page.request, 'POST', '/auth/register', A)).status()).toBe(409);
  await login(page, A);
  const invalid = [{ title: '', body: P1.body }, { title: '   ', body: P1.body }, { body: P1.body },
    { title: P1.title, body: '' }, { title: P1.title, body: '   ' }, { title: P1.title }];
  for (const data of invalid) expect((await api(page.request, 'POST', '/posts', data)).status()).toBe(400);
  expect(await (await page.request.get('/api/posts')).json()).toEqual([]);
  const p = await create(page, P1); const before = snapshot();
  for (const data of invalid) expect((await api(page.request, 'PUT', `/posts/${p.id}`, data)).status()).toBe(400);
  expect(snapshot().replace(/\(\d+ ms\)/g, '')).toBe(before.replace(/\(\d+ ms\)/g, ''));
  await edit(page, { title: '정상 수정', body: '오류 이후에도 저장됩니다.' });
  const posts = await (await page.request.get('/api/posts')).json();
  expect(posts).toHaveLength(1); expect(posts[0].body).toBe('오류 이후에도 저장됩니다.');
  expect(snapshot().match(/board-a@example.test/g)).toHaveLength(1);
});
