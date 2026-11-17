import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 1, retries: 0, timeout: 60000,
  reporter: [['list'], ['json', { outputFile: 'evidence/local/results.json' }]],
  use: { baseURL: 'http://127.0.0.1:5173', actionTimeout: 10000, screenshot: 'only-on-failure', trace: 'off' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: false },
});
