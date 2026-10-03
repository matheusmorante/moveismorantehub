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
  const sequenceRead = vi.fn(async () => ({ data: { ultimo_numero: 701 }, error: null }));
  const sequenceFilters: Array<[string, string | number]> = [];
  const db = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: '77777777-7777-4777-8777-777777777777' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'nfe_sequences') {
        const query: any = {
          eq: vi.fn((field: string, value: string | number) => {
            sequenceFilters.push([field, value]);
            return query;
          }),
          maybeSingle: sequenceRead,
        };
        return { select: vi.fn(() => query) };
      }
      return {
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
      };
    }),
    rpc,
  };
  return { db, rpc, sequenceRead, sequenceFilters };
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

  it.each([
    { model: '55', environment: '2', series: '1', expectedEnvironment: 2 },
    { model: '65', environment: '1', series: '7', expectedEnvironment: 1 },
  ])(
    'consulta uma prévia isolada por modelo, série e ambiente ($model/$series/$environment)',
    async ({ model, environment, series, expectedEnvironment }) => {
      const { db, rpc, sequenceRead, sequenceFilters } = database();
      mocks.createClient.mockReturnValue(db);
      const handler = (await import('../../../../../../api/nfe/reserve-number')).default;
      const result = response();
      await handler(
        {
          method: 'GET',
          headers: { authorization: 'Bearer user-token' },
          query: { model, environment, series, minimumNumber: '700' },
        } as any,
        result.res
      );
      expect(result.statusCode).toBe(200);
      expect(result.body).toEqual({ success: true, nextNumber: 702 });
      expect(result.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      expect(sequenceRead).toHaveBeenCalledOnce();
      expect(sequenceFilters).toEqual([
        ['modelo', model],
        ['serie', series],
        ['ambiente', expectedEnvironment],
      ]);
      expect(rpc).not.toHaveBeenCalled();
    }
  );

  it('rejeita consulta GET sem sessão ou com parâmetros inválidos', async () => {
    const { db, rpc, sequenceRead } = database();
    mocks.createClient.mockReturnValue(db);
    const handler = (await import('../../../../../../api/nfe/reserve-number')).default;
    const unauthenticated = response();
    await handler({ method: 'GET', headers: {}, query: {} } as any, unauthenticated.res);
    expect(unauthenticated.statusCode).toBe(401);
    const invalid = response();
    await handler(
      {
        method: 'GET',
        headers: { authorization: 'Bearer user-token' },
        query: { model: '55', environment: '2', series: '1', minimumNumber: '0' },
      } as any,
      invalid.res
    );
    expect(invalid.statusCode).toBe(400);
    expect(sequenceRead).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
