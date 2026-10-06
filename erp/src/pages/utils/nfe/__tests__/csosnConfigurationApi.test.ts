import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HML_CSOSN_SETTINGS_ID,
  initialHmlCsosnConfiguration,
} from '../../../../../../api/nfe/csosnPolicy';
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), authorizeFiscalOperator: vi.fn() }));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({
  authorizeFiscalOperator: mocks.authorizeFiscalOperator,
}));
import handler from '../../../../../../api/nfe/item-defaults';

function database() {
  let configuration: Record<string, unknown> = initialHmlCsosnConfiguration();
  const app = {
    companyCRT: '1',
    fiscalDefaults: { cst: '102', ncm: '94036000', cfop: '5102', pisCst: '99', cofinsCst: '99' },
  };
  const productId = '00000000-0000-0000-0000-000000000001';
  const items: Record<string, unknown>[] = [
    {},
    { fiscal: { cst: '500', origem: '2' } },
    { productId },
  ];
  let role = 'administrator';
  let writeFails = false;
  const upsert = vi.fn(async (row) => {
    if (writeFails) return { error: new Error('falha sintética') };
    expect(row.id).toBe(HML_CSOSN_SETTINGS_ID);
    configuration = row.data;
    return { error: null };
  });
  const from = vi.fn((table: string) => ({
    upsert,
    select: () => ({
      eq: (_key: string, id: unknown) => ({
        maybeSingle: async () => ({
          error: null,
          data:
            table === 'settings'
              ? { data: id === HML_CSOSN_SETTINGS_ID ? configuration : app }
              : table === 'profiles'
                ? { role, roles: [] }
                : { order_data: { items } },
        }),
      }),
      in: async () => ({
        error: null,
        data: table === 'products' ? [{ id: productId, fiscal: { cst: '201' } }] : [],
      }),
    }),
  }));
  return {
    db: { from },
    from,
    upsert,
    app,
    items,
    set role(value: string) {
      role = value;
    },
    set writeFails(value: boolean) {
      writeFails = value;
    },
  };
}
async function call(method: string, body?: Record<string, unknown>) {
  let status = 200;
  let value: any;
  const res: any = {
    setHeader: vi.fn(),
    status(code: number) {
      status = code;
      return res;
    },
    json(result: unknown) {
      value = result;
      return res;
    },
  };
  await handler({ method, body, headers: { authorization: 'Bearer synthetic' } } as any, res);
  return { status, value };
}
describe('configuração e preparação CSOSN server-side', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic');
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: true, userId: 'admin-synthetic' });
  });
  afterEach(() => vi.unstubAllEnvs());
  it('lê 103 e persiste alteração posterior em registro exclusivo de homologação', async () => {
    const state = database();
    mocks.createClient.mockReturnValue(state.db);
    const before = structuredClone(state.app);
    expect((await call('GET')).value.configuration.csosn).toBe('103');
    expect((await call('PATCH', { environment: 2, csosn: '102' })).status).toBe(200);
    expect((await call('GET')).value.configuration.csosn).toBe('102');
    expect(state.app).toEqual(before);
    expect(state.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          model: '55',
          environment: 2,
          productionApproved: false,
          csosn: '102',
        }),
      })
    );
  });
  it('prepara itens sem substituir exceções do item ou produto', async () => {
    const state = database();
    mocks.createClient.mockReturnValue(state.db);
    const before = structuredClone(state.items);
    const result = await call('POST', { environment: 2, orderId: 'synthetic' });
    expect(result.value.items).toEqual([
      { itemNumber: 1, csosn: '103', source: 'default' },
      { itemNumber: 2, csosn: '500', source: 'saved' },
      { itemNumber: 3, csosn: '201', source: 'catalog' },
    ]);
    expect(state.items).toEqual(before);
    expect(state.upsert).not.toHaveBeenCalled();
  });
  it('não grava produção nem permite campos tributários adicionais', async () => {
    const state = database();
    mocks.createClient.mockReturnValue(state.db);
    expect((await call('PATCH', { environment: 1, csosn: '103' })).status).toBe(422);
    expect((await call('PATCH', { environment: 2, csosn: '103', pisCst: '01' })).status).toBe(422);
    expect(state.upsert).not.toHaveBeenCalled();
  });
  it('recusa alteração por vendedor e propaga falha da persistência', async () => {
    const state = database();
    mocks.createClient.mockReturnValue(state.db);
    state.role = 'seller';
    expect((await call('PATCH', { environment: 2, csosn: '103' })).status).toBe(403);
    state.role = 'administrator';
    state.writeFails = true;
    expect((await call('PATCH', { environment: 2, csosn: '102' })).status).toBe(503);
    expect((await call('GET')).value.configuration.csosn).toBe('103');
  });
});
