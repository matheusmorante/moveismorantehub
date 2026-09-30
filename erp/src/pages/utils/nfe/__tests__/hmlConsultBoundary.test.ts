import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), authorize: vi.fn(), retry: vi.fn() }));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({ createClient: mocks.createClient }));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({ authorizeFiscalOperator: mocks.authorize }));
vi.mock('../../../../../../api/nfe/emitHmlTechnical', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../../../../api/nfe/emitHmlTechnical')>(),
  retryHmlTechnical: mocks.retry,
}));
describe('consulta do documento HML usa a mesma persistência atômica da emissão', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic');
    mocks.authorize.mockResolvedValue({ ok: true, userId: 'TEST_AUT' }); });
  afterEach(() => vi.unstubAllEnvs());
  it.each([
    [{ success: true }, 'authorized'],
    [{ success: false, code: 'HML_CONFIRMED_NOT_FOUND' }, 'not_found'],
    [{ success: false, pending: true }, 'unknown'],
  ])('reconciles without retransmission or independent document updates', async (body, state) => {
    const db = { from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: { id: 'synthetic-document', fiscal_ruleset_version: 'HML_TECHNICAL_V1' }, error: null,
    }) }) }) })) };
    mocks.createClient.mockReturnValue(db);
    mocks.retry.mockResolvedValue({ status: 200, body });
    const { default: handler } = await import('../../../../../../api/nfe/consult');
    const res: any = { setHeader: vi.fn(), status: vi.fn(() => res), json: vi.fn() };
    await handler({ method: 'POST', body: { documentId: 'synthetic-document' },
      headers: { authorization: 'Bearer TEST_AUT' } } as any, res);
    expect(mocks.retry).toHaveBeenCalledWith(db, 'synthetic-document', false);
    expect(res.json).toHaveBeenCalledWith({ ...body, state });
    expect(db.from).toHaveBeenCalledTimes(1);
  });
});
