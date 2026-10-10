import path from 'node:path';
import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const projectRoot = path.resolve(__dirname, '..');

function linkedSupabaseRef(): string {
  const ref = fs.readFileSync(path.join(projectRoot, 'supabase/.temp/project-ref'), 'utf8').trim();
  if (!/^[a-z0-9]{20}$/.test(ref)) {
    throw new Error('E2E fiscal bloqueado: a ref vinculada do Supabase é inválida.');
  }
  return ref;
}

function supabaseRef(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')
      ? url.hostname.split('.')[0] || null
      : null;
  } catch {
    return null;
  }
}

function assertFiscalE2eEnvironment(): void {
  const required = [
    'FISCAL_E2E_MODE',
    'FISCAL_E2E_ALLOWED_SUPABASE_REF',
    'VITE_SUPABASE_URL',
    'SUPABASE_SECRET_KEY',
    'NFE_HML_TEST_OPERATOR_EMAIL',
    'NFE_HML_TEST_OPERATOR_PASSWORD',
    'NFE_CERTIFICATE_BASE64',
    'NFE_CERTIFICATE_PASSWORD',
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`E2E fiscal bloqueado. Variáveis de runtime ausentes: ${missing.join(', ')}.`);
  }

  const mode = process.env.FISCAL_E2E_MODE;
  const configuredRef = supabaseRef(process.env.VITE_SUPABASE_URL);
  const expectedRef = linkedSupabaseRef();
  if (
    !['simulated', 'hml'].includes(mode || '') ||
    !configuredRef ||
    configuredRef !== expectedRef ||
    process.env.FISCAL_E2E_ALLOWED_SUPABASE_REF !== expectedRef ||
    process.env.VERCEL_ENV !== 'development' ||
    process.env.MORANTE_ENV_SOURCE !== 'vercel-development' ||
    process.env.NFE_ENVIRONMENT !== '2' ||
    ['true', '1'].includes((process.env.NFE_PRODUCTION_ENABLED || '').toLowerCase())
  ) {
    throw new Error('E2E fiscal bloqueado: Vercel Development, Supabase vinculado e Homologação são obrigatórios.');
  }

  if (mode === 'simulated') {
    if (
      process.env.NFE_E2E_SEFAZ_MODE !== 'simulated' ||
      process.env.FISCAL_E2E_SIMULATOR_ENABLED !== '1'
    ) {
      throw new Error('E2E fiscal simulado bloqueado: o simulador SOAP não foi habilitado pelo runner seguro.');
    }
  } else if (process.env.NFE_E2E_SEFAZ_MODE === 'simulated') {
    throw new Error('E2E fiscal HML bloqueado: o modo simulado precisa estar desabilitado.');
  }
}

assertFiscalE2eEnvironment();

const appRoot = path.resolve(process.cwd(), '..');

export default defineConfig({
  testDir: './tests/e2e/fiscal',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  outputDir: './test-results/fiscal-interface-e2e',
  globalSetup: './tests/e2e/fiscal/fiscal-policy.global-setup.ts',
  reporter: [
    ['html', { outputFolder: './playwright-report/fiscal-interface-e2e', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    ...devices['Desktop Chrome'],
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev:stack',
    cwd: appRoot,
    url: 'http://127.0.0.1:5173',
    timeout: 240_000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'fiscal-desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
