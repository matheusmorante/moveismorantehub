import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  authorize: vi.fn(),
  retry: vi.fn(),
  consultAuthorized: vi.fn(),
  consultNormalAuthorized: vi.fn(),
  reconcileNormal: vi.fn(),
}));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({
  authorizeFiscalOperator: mocks.authorize,
}));
vi.mock('../../../../../../api/nfe/consultAuthorizedDocument', () => ({
  consultAuthorizedDocument: mocks.consultNormalAuthorized,
}));
vi.mock('../../../../../../api/nfe/normal-sale/outboundAttempt', () => ({
  reconcileNormalSale: mocks.reconcileNormal,
}));
vi.mock('../../../../../../api/nfe/emitHmlTechnical', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../../../api/nfe/emitHmlTechnical')>()),
  retryHmlTechnical: mocks.retry,
  consultAuthorizedHmlTechnical: mocks.consultAuthorized,
}));
describe('consulta do documento HML usa a mesma persistência atômica da emissão', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic');
    mocks.authorize.mockResolvedValue({ ok: true, userId: 'TEST_AUT' });
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each(['autorizada', 'homologada', 'pendente'])('roteia venda normal %s para consulta atual ou reconciliação da tentativa', async (status) => {
    const doc = { id: 'TEST_UNIT_NORMAL', status, fiscal_ruleset_version: 'NORMAL_SALE_V1' };
    const db = { from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: doc, error: null }) }) }) })) };
    mocks.createClient.mockReturnValue(db);
    const result = { status: 200, body: { success: true } };
    mocks.consultNormalAuthorized.mockResolvedValue(result);
    mocks.reconcileNormal.mockResolvedValue(result);
    const { default: handler } = await import('../../../../../../api/nfe/consult');
    const res: any = { setHeader: vi.fn(), status: vi.fn(() => res), json: vi.fn() };
    await handler({ method: 'POST', body: { documentId: doc.id }, headers: {} } as any, res);
    if (status === 'pendente') {
      expect(mocks.reconcileNormal).toHaveBeenCalledWith(db, doc.id);
      expect(mocks.consultNormalAuthorized).not.toHaveBeenCalled();
    } else {
      expect(mocks.consultNormalAuthorized).toHaveBeenCalledWith(doc);
      expect(mocks.reconcileNormal).not.toHaveBeenCalled();
    }
    expect(db.from).toHaveBeenCalledTimes(1);
  });
  it.each([
    [{ success: true }, 'authorized'],
    [{ success: false, code: 'HML_CONFIRMED_NOT_FOUND' }, 'not_found'],
    [{ success: false, pending: true }, 'unknown'],
  ])('reconciles without retransmission or independent document updates', async (body, state) => {
    const db = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: 'synthetic-document', fiscal_ruleset_version: 'HML_TECHNICAL_V1' },
              error: null,
            }),
          }),
        }),
      })),
    };
    mocks.createClient.mockReturnValue(db);
    mocks.retry.mockResolvedValue({ status: 200, body });
    const { default: handler } = await import('../../../../../../api/nfe/consult');
    const res: any = { setHeader: vi.fn(), status: vi.fn(() => res), json: vi.fn() };
    await handler(
      {
        method: 'POST',
        body: { documentId: 'synthetic-document' },
        headers: { authorization: 'Bearer TEST_AUT' },
      } as any,
      res
    );
    expect(mocks.retry).toHaveBeenCalledWith(db, 'synthetic-document', false);
    expect(res.json).toHaveBeenCalledWith({ ...body, state });
    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it('consulta a SEFAZ diretamente para NF-e 55 já autorizada, sem passar pelo retry de emissão', async () => {
    const authorizedDocument = {
      id: 'synthetic-document',
      status: 'homologada',
      fiscal_ruleset_version: 'HML_TECHNICAL_V1',
    };
    const db = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: authorizedDocument,
              error: null,
            }),
          }),
        }),
      })),
    };
    mocks.createClient.mockReturnValue(db);
    mocks.consultAuthorized.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        sefazConsulted: true,
        cStat: '100',
        protocolNumber: '141260000000099',
      },
    });
    const { default: handler } = await import('../../../../../../api/nfe/consult');
    const res: any = { setHeader: vi.fn(), status: vi.fn(() => res), json: vi.fn() };
    await handler(
      {
        method: 'POST',
        body: { documentId: 'synthetic-document' },
        headers: { authorization: 'Bearer TEST_AUT' },
      } as any,
      res
    );
    expect(mocks.consultAuthorized).toHaveBeenCalledWith(authorizedDocument);
    expect(mocks.retry).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      sefazConsulted: true,
      cStat: '100',
      protocolNumber: '141260000000099',
      state: 'authorized',
    });
  });
});
