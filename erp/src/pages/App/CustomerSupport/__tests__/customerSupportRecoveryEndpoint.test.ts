import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const createClient = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({ createClient }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-unit');
  vi.stubEnv('CRON_SECRET', 'cron-secret-unit');
  createClient.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

async function request(authorization: string) {
  const { default: handler } = await import('../../../../../api/whatsapp-webhook');
  const res: any = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(), end: vi.fn().mockReturnThis() };
  await handler({ method: 'GET', query: { operation: 'ai-recovery' }, headers: { authorization } } as any, res);
  return res;
}

it('nega recuperação sem credencial válida antes de acessar o banco', async () => {
  const res = await request('Bearer errado');
  expect(res.status).toHaveBeenCalledWith(401);
  expect(createClient).not.toHaveBeenCalled();
});

it('não habilita recuperação se o segredo não estiver configurado', async () => {
  vi.stubEnv('CRON_SECRET', '');
  const res = await request('Bearer qualquer');
  expect(res.status).toHaveBeenCalledWith(503);
  expect(createClient).not.toHaveBeenCalled();
});

it('permite a consulta da fila ao agendador autenticado', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  createClient.mockReturnValue({ rpc });
  const res = await request('Bearer cron-secret-unit');
  expect(rpc).toHaveBeenCalledWith('customer_support_claim_ai_job', { p_job_id: null });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ processed: false });
});
