import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// A suíte E2E geral não possui harness comprovado de artefatos para o Supabase operacional.
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const isProdSupabase = supabaseUrl.includes('wzpdfmihnwcrgkyagwkd') || supabaseUrl.includes('hkoxhourxwlddgsfdgws');
if (isProdSupabase) {
  throw new Error(
    'A suíte E2E geral está bloqueada para o Supabase operacional: ainda não possui harness de identidade, vínculo e cleanup por UUID comprovado.'
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
