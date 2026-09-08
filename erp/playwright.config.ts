import { defineConfig, devices } from '@playwright/test';

// Trava de segurança E2E: Impede execução de testes Playwright contra Supabase de produção
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const isProdSupabase = supabaseUrl.includes('wzpdfmihnwcrgkyagwkd') || supabaseUrl.includes('hkoxhourxwlddgsfdgws');
if (isProdSupabase && process.env.VITE_APP_ENV !== 'local-test') {
  throw new Error('E2E bloqueado: tentativa de executar testes contra Supabase de produção');
}

export default defineConfig({
  testDir: './tests/e2e/assistant/cases',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5174',
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
