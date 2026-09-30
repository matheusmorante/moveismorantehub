import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));

function response() {
  let statusCode = 200;
  let body: any;
  const res: any = {
    setHeader: vi.fn(),
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(value: unknown) {
      body = value;
      return res;
    },
    end: vi.fn(),
  };
  return {
    res,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

function database(role = 'seller') {
  const rpc = vi.fn(async () => ({ data: 701, error: null }));
  const db = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: '77777777-7777-4777-8777-777777777777' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data:
              table === 'profiles'
                ? { role, roles: [role] }
                : { data: { nfeHomologationSerie: '900', nfeHomologationNextNumber: 700 } },
            error: null,
          }),
        }),
      }),
    })),
    rpc,
  };
  return { db, rpc };
}

describe('reserva fiscal via API autenticada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
    delete process.env.NFE_PRODUCTION_ENABLED;
  });

  it('não consome número sem sessão fiscal', async () => {
    const { db, rpc } = database();
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/reserve-number')).default;
    const result = response();
    await handler(
      { method: 'POST', headers: {}, body: { model: '55', environment: 2, series: '900' } } as any,
      result.res
    );
    expect(result.statusCode).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('nega perfil fora da matriz fiscal antes de reservar', async () => {
    const { db, rpc } = database('accountant');
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/reserve-number')).default;
    const result = response();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { model: '55', environment: 2, series: '900' },
      } as any,
      result.res
    );
    expect(result.statusCode).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('impede reserva direta mesmo para operador autorizado', async () => {
    const { db, rpc } = database('seller');
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/reserve-number')).default;
    const result = response();
    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer user-token' },
        body: { model: '55', environment: 2, series: '900' },
      } as any,
      result.res
    );
    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({
      success: false,
      code: 'FISCAL_CORE_REQUIRED',
      numberReserved: false,
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
