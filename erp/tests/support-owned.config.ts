import { defineConfig } from '@playwright/test';

// Dedicated harness: verifies real owner/run links, restricts every business write.
export default defineConfig({
  testDir: './support-owned', testMatch: 'inbox.spec.ts', workers: 1, retries: 0, timeout: 120_000,
  reporter: [['line']], outputDir: '../output/playwright/support-owned',
  use: { baseURL: 'http://localhost:5173', headless: false, trace: 'off', screenshot: 'off', video: 'off' },
});
