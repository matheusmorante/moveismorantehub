import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));

vi.mock('../../../../../../api/supabaseSecretKey', () => ({
  getSupabaseUrl: () => 'https://example.supabase.co',
  getSupabaseSecretKey: () => 'test-secret',
  getSupabaseAnonKey: () => 'test-anon',
}));

type Dataset = {
  replacements?: any[];
  attempts?: any[];
  authorized?: any[];
  originals?: any[];
  orders?: any[];
  failingTable?: string;
  operatorProfile?: { role: string; roles: string[] };
};

function buildQuery(table: string, dataset: Dataset, reads: string[]) {
  const filters: Array<(row: any) => boolean> = [];
  const orders: Array<{ field: string; ascending: boolean }> = [];
  let range: [number, number] | null = null;
  const query: any = {
    select: () => query,
    neq: (field: string, value: unknown) => {
      filters.push((row) => row[field] !== value);
      return query;
    },
    eq: (field: string, value: unknown) => {
      filters.push((row) => row[field] === value);
      return query;
    },
    in: (field: string, values: unknown[]) => {
      filters.push((row) => values.includes(row[field]));
      return query;
    },
    order: (field: string, options: { ascending: boolean }) => {
      orders.push({ field, ascending: options.ascending });
      return query;
    },
    range: (start: number, end: number) => {
      range = [start, end];
      return query;
    },
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
      reads.push(table);
      if (dataset.failingTable === table) {
        return Promise.resolve({ data: null, error: { code: 'REMOTE_QUERY_FAILED' } }).then(resolve, reject);
      }
      let rows = table === 'nfe_order_edit_replacements'
        ? dataset.replacements || []
        : table === 'orders'
          ? dataset.orders || []
          : dataset.attempts || [];
      rows = rows.filter((row) => filters.every((filter) => filter(row)));
      if (table === 'nfe_documents') {
        const hasAuthorized = dataset.authorized || [];
        const matchedAttempts = (dataset.attempts || []).filter((row) => filters.every((filter) => filter(row)));
        const matchedAuthorized = hasAuthorized.filter((row) => filters.every((filter) => filter(row)));
        const matchedOriginals = (dataset.originals || []).filter((row) => filters.every((filter) => filter(row)));
        rows = matchedAttempts.length ? matchedAttempts : matchedAuthorized.length ? matchedAuthorized : matchedOriginals;
      }
      rows = [...rows];
      for (const order of [...orders].reverse()) {
        rows.sort((left, right) => {
          const a = left[order.field];
          const b = right[order.field];
          const result = a === b ? 0 : a < b ? -1 : 1;
          return order.ascending ? result : -result;
        });
      }
      if (range) rows = rows.slice(range[0], range[1] + 1);
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    },
  };
  return query;
}

function setup(dataset: Dataset) {
  const reads: string[] = [];
  mocks.createClient.mockImplementation((_url: string, key: string) => {
    const profileQuery: any = {
      select: () => profileQuery,
      eq: () => profileQuery,
      maybeSingle: async () => ({
        // Token validation alone doesn't authenticate subsequent profile queries.
        data: key === 'test-secret'
          ? dataset.operatorProfile || { role: 'administrator', roles: ['administrator'] }
          : null,
        error: null,
      }),
    };
    return {
      auth: { getUser: async (token: string) => ({ data: { user: token === 'valid-token' ? { id: 'operator' } : null }, error: null }) },
      from: (table: string) => table === 'profiles' ? profileQuery : buildQuery(table, dataset, reads),
    };
  });
  return { reads };
}

function responseRecorder() {
  let statusCode = 200;
  let responseBody: any = null;
  const res: any = {
    setHeader: vi.fn(),
    end: vi.fn(),
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseBody = data;
      return res;
    },
  };
  return { res, get statusCode() { return statusCode; }, get responseBody() { return responseBody; } };
}

async function invoke(method = 'GET', authorization = 'Bearer valid-token', dataset: Dataset = {}) {
  const handler = (await import('../../../../../../api/nfe/fiscal-pendencies')).default;
  const response = responseRecorder();
  const dataReads = setup(dataset);
  await handler({ method, headers: { authorization } } as any, response.res);
  return { ...response, ...dataReads };
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => vi.clearAllMocks());

describe('Endpoint /api/nfe/fiscal-pendencies', () => {
  it('recusa método de escrita', async () => {
    const result = await invoke('POST');
    expect(result.statusCode).toBe(405);
    expect(result.reads).toEqual([]);
  });

  it('exige autenticação e não consulta dados fiscais sem operador autorizado', async () => {
    const result = await invoke('GET', '');
    expect(result.statusCode).toBe(401);
    expect(result.responseBody.error).toBe('Autenticação necessária.');
    expect(result.reads).toEqual([]);
  });

  it('nega perfil sem permissão antes de consultar dados fiscais', async () => {
    const result = await invoke('GET', 'Bearer valid-token', {
      operatorProfile: { role: 'seller', roles: ['seller'] },
    });
    expect(result.statusCode).toBe(403);
    expect(result.reads).toEqual([]);
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
  });

  it('inclui rejeição sem limite de idade e usa a autorização mais recente para fechar pendência resolvida', async () => {
    const result = await invoke('GET', 'Bearer valid-token', {
      attempts: [
        { id: 'old-open', order_id: 'order-open', ambiente: 1, modelo: '55', status: 'rejeitada', document_type: 'outbound', created_at: '2026-06-01T10:00:00.000Z' },
        { id: 'old-resolved', order_id: 'order-resolved', ambiente: 1, modelo: '55', status: 'rejeitada', document_type: 'outbound', created_at: '2026-06-02T10:00:00.000Z' },
      ],
      authorized: [
        { id: 'auth-before', order_id: 'order-resolved', ambiente: 1, status: 'autorizada', document_type: 'outbound', created_at: '2026-05-30T10:00:00.000Z' },
        { id: 'auth-after', order_id: 'order-resolved', ambiente: 1, status: 'autorizada', document_type: 'outbound', created_at: '2026-06-03T10:00:00.000Z' },
      ],
      orders: [
        { id: 'order-open', order_index: 1, status: 'scheduled', order_data: {} },
        { id: 'order-resolved', order_index: 2, status: 'scheduled', order_data: {} },
      ],
    });

    expect(result.statusCode).toBe(200);
    expect(result.responseBody.pendencies.map((item: any) => item.orderId)).toEqual(['order-open']);
    expect(result.responseBody.pendencies[0].model).toBe('55');
  });

  it('retorna erro em vez de lista vazia quando uma consulta remota falha', async () => {
    const result = await invoke('GET', 'Bearer valid-token', { failingTable: 'nfe_documents' });
    expect(result.statusCode).toBe(503);
    expect(result.responseBody.success).toBe(false);
    expect(result.responseBody.error).toMatch(/lista completa/);
  });

  it('percorre páginas além do limite padrão do PostgREST', async () => {
    const attempts = Array.from({ length: 1001 }, (_, index) => ({
      id: `attempt-${index}`,
      order_id: `order-${index}`,
      ambiente: 2,
      modelo: '55',
      status: 'rejeitada',
      document_type: 'outbound',
      created_at: '2026-10-20T10:00:00.000Z',
    }));
    const orders = attempts.map((attempt, index) => ({
      id: attempt.order_id,
      order_index: index + 1,
      status: 'scheduled',
      order_data: {},
    }));

    const result = await invoke('GET', 'Bearer valid-token', { attempts, orders });

    expect(result.statusCode).toBe(200);
    expect(result.responseBody.count).toBe(1001);
  });

  it.each([
    ['ambiente', { id: 'bad-env', order_id: 'order-1', ambiente: 3, modelo: '55', status: 'rejeitada', document_type: 'outbound', created_at: '2026-10-20T10:00:00.000Z' }],
    ['modelo', { id: 'bad-model', order_id: 'order-1', ambiente: 2, modelo: '99', status: 'rejeitada', document_type: 'outbound', created_at: '2026-10-20T10:00:00.000Z' }],
  ])('falha de modo seguro diante de %s inválido', async (_field, attempt) => {
    const result = await invoke('GET', 'Bearer valid-token', {
      attempts: [attempt],
      orders: [{ id: 'order-1', order_index: 1, status: 'scheduled', order_data: {} }],
    });
    expect(result.statusCode).toBe(503);
  });

  it('classifica falha da tentativa de substituição como processamento com erro', async () => {
    const result = await invoke('GET', 'Bearer valid-token', {
      replacements: [{ id: 'replacement-1', order_id: 'order-1', original_document_id: 'original-1', environment: 2, reversal_kind: 'estorno', status: 'ready_to_reissue', created_at: '2026-10-20T09:00:00.000Z' }],
      attempts: [{ id: 'attempt-1', order_id: 'order-1', ambiente: 2, modelo: '65', status: 'erro', document_type: 'outbound', motivo_status: 'Falha do serviço', created_at: '2026-10-20T10:00:00.000Z' }],
      originals: [{ id: 'original-1', numero_nfe: 75, modelo: '65', ambiente: 2 }],
      orders: [{ id: 'order-1', order_index: 3, status: 'scheduled', order_data: {} }],
    });
    expect(result.statusCode).toBe(200);
    expect(result.responseBody.pendencies[0]).toMatchObject({
      pendencyType: 'processing',
      situationStatus: 'failed',
      currentAttemptStatus: 'erro',
      model: '65',
    });
  });
});
