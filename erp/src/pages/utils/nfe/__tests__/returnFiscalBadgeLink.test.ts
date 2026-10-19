import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../../supabaseConfig', () => ({ supabase: {
  from: mocks.from, auth: { getSession: async () => ({ data: { session: null } }) },
} }));
import { fetchOrderFiscalBadgeStatuses } from '../orderFiscalBadgeService';
afterEach(() => vi.clearAllMocks());

describe('vínculo da NFD ao pedido de devolução', () => {
  it('consulta related_return_order_id e mantém uma só nota quando os dois vínculos a encontram', async () => {
    const queries: string[] = [];
    const nfd = { id: 'nfd-709', order_id: 'sale', related_return_order_id: 'return', document_type: 'return', status: 'homologada', ambiente: 2, numero_nfe: 709 };
    mocks.from.mockImplementation((table: string) => {
      let select = '';
      const query: any = {
        select: (value: string) => { select = value; return query; },
        eq: () => query,
        in: async (column: string, values: string[]) => {
          queries.push(`${table}.${column}`);
          if (table === 'orders') return { data: column === 'id' ? [{ id: 'return', status: 'fulfilled' }] : [], error: null };
          if (table === 'nfe_document_items') return { data: [{ document_id: 'nfd-709', billed_quantity: 1 }], error: null };
          if (select === 'id,xml_protocolo') return { data: [], error: null };
          return { data: column === 'related_return_order_id' || values.includes('sale') ? [nfd] : [], error: null };
        },
      };
      return query;
    });
    const result = await fetchOrderFiscalBadgeStatuses(['sale', 'return']);
    expect(queries).toContain('nfe_documents.related_return_order_id');
    expect(result.return).toMatchObject({ devolucaoStatus: 'issued', devolucaoCount: 1, devolucaoDocumentId: 'nfd-709', devolucaoEnvironment: 2 });
    expect(result.return.devolucaoDocuments?.[0].order_id).toBe('return');
    expect(result.return.production).toBe('not_issued');
  });
});
