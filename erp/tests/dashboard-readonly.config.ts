import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './dashboard-readonly',
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [['line']],
  outputDir: '../output/playwright/dashboard-readonly',
  use: { trace: 'off', screenshot: 'off', video: 'off' },
});
