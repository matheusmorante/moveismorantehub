import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  validNcm: true,
  userClientCreated: false,
  auth: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
}));
vi.mock('../../../../../../../api/products/serverDb', () => ({
  createProductDbClient: (_url: string, _key: string, token?: string) => {
    if (token) database.userClientCreated = true;
    return ({
    auth: { getUser: database.auth },
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query = {
        select: () => query,
        eq: (field: string, value: unknown) => { filters[field] = value; return query; },
        in: () => Promise.resolve({ data: [{ code: '94036000', official_description: 'Móveis de madeira', active: database.validNcm, start_date: null, end_date: null }], error: null }),
        order: () => query,
        limit: () => Promise.resolve({ data: table === 'categories'
          ? [{ id: 'cat-1', name: 'Guarda-roupas', active: true, type: 'category' }]
          : [{ child_id: 'cat-1' }], error: null }),
        maybeSingle: () => Promise.resolve({ data: table === 'categories'
          ? { id: 'cat-1', name: 'Guarda-roupas', active: true, type: 'category' }
          : { code: filters.code, official_description: 'Móveis de madeira', active: database.validNcm, start_date: null, end_date: null }, error: null }),
      };
      return query;
    },
    rpc: () => Promise.resolve({ data: [{ code: '94036000', rank: 1 }], error: null }),
  }); },
}));
vi.mock('../../../../../../../src/telemetry/tracer', () => ({ withSpan: (_name: string, fn: (span: { setAttribute: () => void }) => unknown) => fn({ setAttribute: () => undefined }) }));

let handler: (req: unknown, res: unknown) => Promise<unknown>;
beforeAll(async () => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-test');
  vi.stubEnv('TYPESAFE_API_KEY', 'private-test-key');
  handler = (await import('../../../../../../../api/products/classify')).default as typeof handler;
});
beforeEach(() => {
  database.validNcm = true;
  database.userClientCreated = false;
  database.auth.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ answers: { category: { choice: 'c0' }, ncm: { choice: 'n0' } } }) }));
});

async function call(body: Record<string, unknown>, authorization = 'Bearer user-test-token') {
  let status = 200;
  let payload: any;
  const res = {
    setHeader: () => undefined,
    status: (code: number) => { status = code; return res; },
    json: (data: unknown) => { payload = data; return res; },
    end: () => res,
  };
  await handler({ method: 'POST', headers: { authorization }, body }, res);
  return { status, payload };
}

describe('API Jev para produtos', () => {
  it('oferece somente candidatos do banco e devolve os validados', async () => {
    const result = await call({ name: 'Guarda Roupa Sidney', material: 'MDP' });
    expect(result.status).toBe(200);
    expect(result.payload.category.id).toBe('cat-1');
    expect(result.payload.ncm.code).toBe('94036000');
    expect(database.userClientCreated).toBe(true);
    const outbound = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(outbound.questions.ncm.criteria.n0).toContain('94036000');
    expect(outbound.state).not.toHaveProperty('customer');
    expect(JSON.stringify(result.payload)).not.toContain('private-test-key');
  });

  it('rejeita escolha fora das opções e não aceita NCM injetado pelo cliente', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ answers: { category: { choice: 'c999' }, ncm: { choice: '99999999' } } }) } as Response);
    const result = await call({ name: 'Guarda Roupa Sidney', ncmCandidate: '99999999' });
    expect(result.status).toBe(200);
    expect(result.payload).toEqual({ category: null, ncm: null });
  });

  it('descarta candidato que perdeu a vigência antes da resposta', async () => {
    vi.mocked(fetch).mockImplementation(async () => { database.validNcm = false; return { ok: true, json: async () => ({ answers: { ncm: { choice: 'n0' } } }) } as Response; });
    const result = await call({ name: 'Guarda Roupa Sidney', categoryId: 'cat-1' });
    expect(result.payload.ncm).toBeNull();
  });

  it('não consulta Jev quando categoria e NCM já estão preenchidos', async () => {
    const result = await call({ name: 'Guarda Roupa Sidney', categoryId: 'cat-1', ncm: '94036000' });
    expect(result.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita usuário não autenticado', async () => {
    const result = await call({ name: 'Guarda Roupa Sidney' }, '');
    expect(result.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retorna fallback em erro HTTP do Jev', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 429 } as Response);
    const result = await call({ name: 'Guarda Roupa Sidney' });
    expect(result.status).toBe(503);
    expect(result.payload).toEqual({ error: 'Classificação indisponível.' });
  });

  it('retorna fallback quando Jev excede o timeout', async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException('Request timed out', 'TimeoutError'));
    const result = await call({ name: 'Guarda Roupa Sidney' });
    expect(result.status).toBe(503);
    expect(result.payload).toEqual({ error: 'Classificação indisponível.' });
  });
});
