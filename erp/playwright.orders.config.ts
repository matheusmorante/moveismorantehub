import { defineConfig, devices } from '@playwright/test';

// Trava de segurança E2E: Impede execução de testes Playwright contra Supabase de produção sem flag explícita
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const isProdSupabase = supabaseUrl.includes('wzpdfmihnwcrgkyagwkd') || supabaseUrl.includes('hkoxhourxwlddgsfdgws');
if (isProdSupabase && process.env.VITE_APP_ENV !== 'local-test') {
  throw new Error('E2E bloqueado: tentativa de executar testes contra Supabase de produção');
}

export default defineConfig({
  testDir: './tests/e2e/orders',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list']
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
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
