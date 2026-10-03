import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  authorizeFiscalOperator: vi.fn(),
  parseAuthorizedInvoiceLines: vi.fn(),
}));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({
  createClient: mocks.createClient,
}));
vi.mock('../../../../../../api/nfe/fiscalAuthorization', () => ({
  authorizeFiscalOperator: mocks.authorizeFiscalOperator,
}));
vi.mock('../invoiceLineSnapshot', () => ({
  parseAuthorizedInvoiceLines: mocks.parseAuthorizedInvoiceLines,
}));
const handler = async (req: any, res: any) =>
  (await import('../../../../../../api/nfe/return-capacity')).default(req, res);

function setup(testData: Record<string, unknown> = {}) {
  const filters: Array<[string, string, unknown]> = [];
  const from = vi.fn((table: string) => {
    const query: any = {
      select: () => query,
      eq: (field: string, value: unknown) => {
        filters.push([table, field, value]);
        return query;
      },
      in: () => query,
      or: () => query,
      order: () => query,
      maybeSingle: async () => ({
        data: {
          id: '11111111-1111-4111-8111-111111111111',
          order_type: 'sale',
          status: 'fulfilled',
          order_data: testData,
        },
        error: null,
      }),
      then: (resolve: any, reject: any) =>
        Promise.resolve({
          data:
            table === 'nfe_documents'
              ? [{ id: 'doc', modelo: '55', xml_nfe: '<NFe/>' }]
              : table === 'nfe_document_items'
                ? [{ item_number: 1, billed_quantity: 2 }]
                : [],
          error: null,
        }).then(resolve, reject),
    };
    return query;
  });
  mocks.createClient.mockReturnValue({ from });
  let status = 200;
  let body: any;
  const res: any = {
    setHeader: vi.fn(),
    status: (value: number) => {
      status = value;
      return res;
    },
    json: (value: any) => {
      body = value;
      return res;
    },
  };
  return { from, filters, res, result: () => ({ status, body }) };
}

describe('return capacity fiscal environment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
    mocks.authorizeFiscalOperator.mockResolvedValue({ ok: true, userId: 'operator' });
    mocks.parseAuthorizedInvoiceLines.mockReturnValue([
      { invoiceItemNumber: 1, productCode: 'product', description: 'HML', billedQuantity: 2 },
    ]);
  });
  it.each([1, 2])('loads only authorized lines of environment %s', async (environment) => {
    const test = setup(
      environment === 2
        ? {
            is_test: true,
            test_environment: 'homologation',
            testRunId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          }
        : {}
    );
    await handler(
      {
        method: 'POST',
        headers: {},
        body: { orderId: '11111111-1111-4111-8111-111111111111', environment },
      } as any,
      test.res
    );
    expect(test.result().status).toBe(200);
    expect(test.filters).toContainEqual(['nfe_documents', 'ambiente', environment]);
    expect(test.filters).toContainEqual([
      'nfe_documents',
      'status',
      environment === 1 ? 'autorizada' : 'homologada',
    ]);
    expect(test.result().body).toMatchObject({
      environment,
      hasAuthorizedInvoice: true,
      hasAuthorizedProductionInvoice: environment === 1,
      lines: [{ originalEnvironment: environment, availableQuantity: 2 }],
    });
  });
  it('rejects requests for the other environment before querying documents', async () => {
    const test = setup({
      is_test: true,
      test_environment: 'homologation',
      testRunId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    await handler(
      {
        method: 'POST',
        headers: {},
        body: { orderId: '11111111-1111-4111-8111-111111111111', environment: 1 },
      } as any,
      test.res
    );
    expect(test.result().status).toBe(409);
    expect(test.from).not.toHaveBeenCalledWith('nfe_documents');
  });
  it('rejects incomplete HML markers instead of treating them as production', async () => {
    const test = setup({ test_environment: 'homologation' });
    await handler(
      {
        method: 'POST',
        headers: {},
        body: { orderId: '11111111-1111-4111-8111-111111111111' },
      } as any,
      test.res
    );
    expect(test.result().status).toBe(409);
    expect(test.from).not.toHaveBeenCalledWith('nfe_documents');
  });
});
