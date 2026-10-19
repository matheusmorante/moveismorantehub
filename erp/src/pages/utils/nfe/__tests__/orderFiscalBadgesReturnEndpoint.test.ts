import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({ createClient: mocks.createClient }));
vi.mock('../../../../../../api/supabaseSecretKey', () => ({
  getSupabaseUrl: () => 'https://example.supabase.co', getSupabaseSecretKey: () => 'test-secret', getSupabaseAnonKey: () => 'test-anon',
}));
afterEach(() => vi.clearAllMocks());

describe('indicador fiscal da devolução por vínculo próprio', () => {
  it.each([false, true])('resolve vínculo sem duplicar e falha explicitamente quando a consulta relacionada falha (%s)', async failRelated => {
    const nfd = { id: 'nfd-709', order_id: 'sale', related_return_order_id: 'return', document_type: 'return', status: 'homologada', ambiente: 2, numero_nfe: 709 };
    mocks.createClient.mockReturnValue({ from: (table: string) => {
      let selection = '', column = '', ids: string[] = [];
      const query: any = {
        select: (value: string) => { selection = value; return query; },
        in: (value: string, values: string[]) => { column = value; ids = values; return query; },
        eq: () => query, order: () => query,
        then: (resolve: any, reject: any) => Promise.resolve({
          data: table === 'orders' && column === 'id' ? [{ id: 'return', status: 'fulfilled' }]
            : table === 'nfe_documents' && selection.includes('related_return_order_id')
              && (column === 'related_return_order_id' || ids.includes('sale')) ? [nfd] : [],
          error: failRelated && table === 'nfe_documents' && column === 'related_return_order_id' ? { message: 'unavailable' } : null,
        }).then(resolve, reject),
      };
      return query;
    } });
    let status = 200, body: any;
    const res: any = { setHeader: vi.fn(), status: (value: number) => { status = value; return res; }, json: (value: any) => { body = value; return res; } };
    const handler = (await import('../../../../../../api/nfe/order-fiscal-badges')).default;
    await handler({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { orderIds: ['return'] } } as any, res);
    expect(status).toBe(failRelated ? 503 : 200);
    if (!failRelated) expect(body.documents).toEqual([expect.objectContaining({ id: 'nfd-709', order_id: 'return', returnOrderCode: 'return', ambiente: 2 })]);
  });
});
