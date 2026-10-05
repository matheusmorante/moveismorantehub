import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ config: vi.fn(), existsSync: vi.fn(() => true) }));
vi.mock('dotenv', () => ({ default: { config: mocks.config } }));
vi.mock('fs', () => ({ default: { existsSync: mocks.existsSync } }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

it.each(['development', 'preview', 'production'])(
  'não consulta arquivos dotenv no runtime %s',
  async (runtime) => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', runtime);
    vi.stubEnv('SUPABASE_SECRET_KEY', 'TEST_AUT_BACKEND_KEY');
    const { getSupabaseSecretKey } = await import('../../../../../../api/supabaseSecretKey');
    expect(getSupabaseSecretKey()).toBe('TEST_AUT_BACKEND_KEY');
    expect(mocks.config).not.toHaveBeenCalled();
    expect(mocks.existsSync).not.toHaveBeenCalled();
  }
);
it('não completa variáveis Vercel Development com arquivo local', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('VERCEL_ENV', undefined);
  vi.stubEnv('MORANTE_ENV_SOURCE', 'vercel-development');
  vi.stubEnv('SUPABASE_SECRET_KEY', undefined);
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', undefined);
  const { getSupabaseSecretKey } = await import('../../../../../../api/supabaseSecretKey');
  expect(getSupabaseSecretKey()).toBeUndefined();
  expect(mocks.config).not.toHaveBeenCalled();
});
it('preserva fallback legado somente quando a chave nova está vazia', async () => {
  vi.stubEnv('SUPABASE_SECRET_KEY', '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'TEST_AUT_LEGACY_KEY');
  const { getSupabaseSecretKey } = await import('../../../../../../api/supabaseSecretKey');
  expect(getSupabaseSecretKey()).toBe('TEST_AUT_LEGACY_KEY');
});
