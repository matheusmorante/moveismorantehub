import { defineConfig, devices } from '@playwright/test';

// Trava de segurança E2E: Impede execução não autorizada em produção sem isolamento
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const isProdSupabase = supabaseUrl.includes('wzpdfmihnwcrgkyagwkd') || supabaseUrl.includes('hkoxhourxwlddgsfdgws');
if (isProdSupabase && process.env.VITE_APP_ENV !== 'local-test' && !process.env.ALLOW_E2E_PROD) {
  console.warn('[Playwright Stock] Atenção: Executando testes E2E com identificador único seguro [TESTE_AUT].');
}

export default defineConfig({
  testDir: './tests/e2e/stock',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-stock', open: 'never' }]
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
    viewport: { width: 1366, height: 768 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
