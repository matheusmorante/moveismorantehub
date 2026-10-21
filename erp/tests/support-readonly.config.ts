import { defineConfig } from '@playwright/test';

// Dedicated read-only UI proof. The spec blocks business writes at the network
// boundary; it cannot be used for persistence or to bypass the general E2E gate.
export default defineConfig({
  testDir: './support-readonly',
  testMatch: 'support-login.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['line']],
  outputDir: '../output/playwright/support-readonly',
  use: { baseURL: 'http://localhost:5173', headless: false, trace: 'off', screenshot: 'off', video: 'off' },
});
