import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { start, stop, signup, login, create, A, P1, P3 } from '../e2e/harness.js';
let vite, browser;
try {
  await start();
  vite = spawn('npm', ['run', 'dev'], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:5173')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1000 } });
  await signup(page, A); await login(page, A); await create(page, P1); await create(page, P3);
  await page.goto('/'); await page.getByRole('heading', { name: P1.title }).waitFor();
  mkdirSync('evidence/local', { recursive: true });
  await page.screenshot({ path: 'evidence/local/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'evidence/local/mobile.png', fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw new Error('Mobile horizontal overflow');
  console.log('Desktop/mobile screenshots saved; no horizontal overflow at 390px.');
} finally {
  await browser?.close();
  if (vite) process.kill(-vite.pid, 'SIGTERM');
  await stop();
}
