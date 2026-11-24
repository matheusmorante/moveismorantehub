import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  validNcm: true,
  reserveDecision: {
    allowed: true,
    reason: 'reserved',
    used_input_tokens: 100,
    retry_after_seconds: 0,
    cached_response: null as unknown,
  },
  auth: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
  checkQuota: vi.fn().mockResolvedValue({ allowed: true, reservationId: 'res-1' }),
  recordUsage: vi.fn(),
  releaseQuota: vi.fn(),
  searchTerms: [] as string[],
}));

vi.mock('../../../../../../../api/products/serverDb', () => ({
  createProductDbClient: (_url: string, _key: string, _token?: string) => ({
    auth: { getUser: mocks.auth },
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query = {
        select: () => query,
        eq: (field: string, value: unknown) => {
          filters[field] = value;
          return query;
        },
        in: () =>
          Promise.resolve({
            data: [
              {
                code: '94036000',
                official_description: 'Móveis de madeira',
                active: mocks.validNcm,
                is_active: mocks.validNcm,
                start_date: null,
                end_date: null,
              },
            ],
            error: null,
          }),
        order: () => query,
        limit: () =>
          Promise.resolve({
            data:
              table === 'categories'
                ? [{ id: 'cat-1', name: 'Guarda-roupas', active: true, type: 'category' }]
                : [{ child_id: 'cat-1' }],
            error: null,
          }),
        maybeSingle: () =>
          Promise.resolve({
            data:
              table === 'products'
                ? { category_id: 'cat-1' }
                : table === 'categories'
                  ? { id: 'cat-1', name: 'Guarda-roupas', active: true, type: 'category' }
                  : {
                      code: filters.code,
                      official_description: 'Móveis de madeira',
                      active: mocks.validNcm,
                      is_active: mocks.validNcm,
                      start_date: null,
                      end_date: null,
                    },
            error: null,
          }),
      };
      return query;
    },
    rpc: (name: string, args: { search_term?: string }) => {
      if (name === 'reserve_jev_classification_tokens') {
        return Promise.resolve({ data: [mocks.reserveDecision], error: null });
      }
      if (name === 'settle_jev_classification_tokens') {
        return Promise.resolve({ data: null, error: null });
      }
      if (args.search_term) mocks.searchTerms.push(args.search_term);
      return Promise.resolve({ data: [{ code: '94036000', rank: 1 }], error: null });
    },
  }),
}));

vi.mock('../../../../../../../erp/api/_lib/secureIntegrations/aiQuotaBridge', () => ({
  checkAiQuotaOrReject: mocks.checkQuota,
  recordAiUsageTokensSafe: mocks.recordUsage,
  releaseAiReservationSafe: mocks.releaseQuota,
}));

vi.mock('../../../../../../../src/telemetry/tracer', () => ({
  withSpan: (_name: string, fn: (span: { setAttribute: () => void }) => unknown) =>
    fn({ setAttribute: () => undefined }),
}));

let handler: (req: unknown, res: unknown) => Promise<unknown>;

beforeAll(async () => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-only-test');
  vi.stubEnv('OPENAI_API_KEY', 'sk-test-classify');
  handler = (await import('../../../../../../../api/products/classify')).default as typeof handler;
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.validNcm = true;
  mocks.searchTerms = [];
  mocks.reserveDecision = {
    allowed: true,
    reason: 'reserved',
    used_input_tokens: 100,
    retry_after_seconds: 0,
    cached_response: null,
  };
  mocks.auth.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  mocks.checkQuota.mockResolvedValue({ allowed: true, reservationId: 'res-1' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        usage: { prompt_tokens: 120, completion_tokens: 20, total_tokens: 140 },
        choices: [{ message: { content: JSON.stringify({ category: { choice: 'c0' }, ncm: { choice: 'n0' } }) } }],
      }),
    })
  );
});

async function invoke(body: Record<string, unknown>, authorization = 'Bearer user-token') {
  let status = 200;
  let payload: unknown;
  const headers: Record<string, string> = {};
  const res = {
    headersSent: false,
    setHeader: (name: string, val: string) => {
      headers[name] = val;
    },
    status: (code: number) => {
      status = code;
      return res;
    },
    json: (data: unknown) => {
      payload = data;
      return res;
    },
    end: () => res,
  };
  await handler({ method: 'POST', headers: { authorization }, body }, res);
  return { status, payload: payload as Record<string, any>, headers };
}

describe('api/products/classify modular pipeline', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const res = await invoke({ name: 'Guarda Roupa Sidney' }, '');
    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid source with 400', async () => {
    const res = await invoke({ name: 'Mesa Jantar', source: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('uses product category context and material for NCM search when product already has category', async () => {
    const res = await invoke({ name: 'Produto Especial Linha Modelo', material: 'Madeira Maciça', productId: 'prod-1' });
    expect(res.status).toBe(200);
    expect(res.payload).toEqual({
      category: null,
      ncm: { code: '94036000', description: 'Móveis de madeira' },
    });
    expect(mocks.searchTerms).toContain('guarda roupa');
  });

  it('validates catalog category and NCM candidates returned by OpenAI when product has no category', async () => {
    const res = await invoke({ name: 'Produto Especial Linha Modelo', material: 'Madeira Maciça' });
    expect(res.status).toBe(200);
    expect(res.payload).toEqual({
      category: { id: 'cat-1', name: 'Guarda-roupas' },
      ncm: { code: '94036000', description: 'Móveis de madeira' },
    });
  });

  it('uses validated cached classification without calling OpenAI and releases quota', async () => {
    mocks.reserveDecision = {
      allowed: true,
      reason: 'cached',
      used_input_tokens: 0,
      retry_after_seconds: 0,
      cached_response: {
        category: { id: 'cat-1', name: 'Guarda-roupas' },
        ncm: { code: '94036000', description: 'Móveis de madeira' },
      },
    };
    const res = await invoke({ name: 'Produto Especial Linha Modelo' });
    expect(res.status).toBe(200);
    expect(res.payload.ncm.code).toBe('94036000');
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.releaseQuota).toHaveBeenCalledWith(expect.anything(), 'res-1');
  });

  it('returns 429 with Retry-After when input token budget reaches limit', async () => {
    mocks.reserveDecision = {
      allowed: false,
      reason: 'token_limit',
      used_input_tokens: 2000,
      retry_after_seconds: 12,
      cached_response: null,
    };
    const res = await invoke({ name: 'Produto Especial Linha Modelo' });
    expect(res.status).toBe(429);
    expect(res.headers['Retry-After']).toBe('12');
    expect(mocks.releaseQuota).toHaveBeenCalled();
  });

  it('preserves deterministic wooden bedroom NCM if OpenAI returns HTTP 429', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 429, json: async () => ({}) } as Response);
    const res = await invoke({ name: 'Guarda Roupa Sidney', material: 'MDP' });
    expect(res.status).toBe(200);
    expect(res.payload).toEqual({
      category: null,
      ncm: { code: '94035000', description: 'Móveis de madeira' },
    });
  });
});
