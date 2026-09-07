import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração Playwright para testes E2E do App Mobile via Expo Web
 * URL alvo: http://localhost:8081
 *
 * Rodar: npx playwright test --config=playwright.mobile.config.ts
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/mobile-*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report-mobile', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // Timeout mais alto para aguardar o Expo Web renderizar
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'Mobile Chrome (Expo Web)',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
