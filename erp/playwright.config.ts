import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// O projeto principal pode ser usado em E2E quando a suíte declara dados isolados.
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const isProdSupabase = supabaseUrl.includes('wzpdfmihnwcrgkyagwkd') || supabaseUrl.includes('hkoxhourxwlddgsfdgws');
if (isProdSupabase && process.env.E2E_ISOLATED_DATA !== '1') {
  throw new Error(
    'E2E exige E2E_ISOLATED_DATA=1 ao usar Supabase real, além de testRunId, ' +
    'registro de IDs próprios e cleanup por ID.'
  );
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.PW_HTML_REPORT === '1' || process.env.CI
    ? [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']]
    : [['dot']],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
