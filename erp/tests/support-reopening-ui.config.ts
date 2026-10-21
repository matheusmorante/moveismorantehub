import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './support-reopening', testMatch: 'reopening.spec.ts', workers: 1, retries: 0, timeout: 120_000,
  reporter: [['line']], outputDir: '../output/playwright/support-reopening',
  use: { baseURL: 'http://localhost:5173', headless: false, trace: 'off', screenshot: 'off', video: 'off' },
});
