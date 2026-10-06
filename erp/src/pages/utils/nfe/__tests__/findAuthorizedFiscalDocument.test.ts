import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findAuthorizedFiscalDocument } from '../findAuthorizedFiscalDocument';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../../supabaseConfig', () => ({
  supabase: { from: mocks.from },
}));

describe('findAuthorizedFiscalDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupQuery = (rows: any[], error: any = null) => {
    const query: any = {
      select: () => query,
      eq: () => query,
      in: () => query,
      order: () => query,
      then: (resolve: any, reject: any) =>
        Promise.resolve({ data: rows, error }).then(resolve, reject),
    };
    mocks.from.mockReturnValue(query);
    return query;
  };

  it('retorna null se orderId for vazio', async () => {
    const result = await findAuthorizedFiscalDocument('');
    expect(result).toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('retorna null quando não há documentos no banco', async () => {
    setupQuery([]);
    const result = await findAuthorizedFiscalDocument('sale-123');
    expect(result).toBeNull();
  });

  it('retorna null quando a query ao supabase falha', async () => {
    setupQuery(null, new Error('Network error'));
    const result = await findAuthorizedFiscalDocument('sale-123');
    expect(result).toBeNull();
  });

  it('retorna documento autorizado de saída em produção', async () => {
    const doc = {
      id: 'doc-prod',
      order_id: 'sale-123',
      status: 'autorizada',
      document_type: 'outbound',
      ambiente: 1,
      modelo: '55',
    };
    setupQuery([doc]);

    const result = await findAuthorizedFiscalDocument('sale-123');
    expect(result).toEqual(doc);
  });

  it('retorna documento homologado de saída em homologação', async () => {
    const doc = {
      id: 'doc-hml',
      order_id: 'sale-123',
      status: 'homologada',
      document_type: 'outbound',
      ambiente: 2,
      modelo: '55',
    };
    setupQuery([doc]);

    const result = await findAuthorizedFiscalDocument('sale-123');
    expect(result).toEqual(doc);
  });

  it('ignora documentos de devolução ou estorno', async () => {
    const returnDoc = {
      id: 'doc-return',
      order_id: 'sale-123',
      status: 'autorizada',
      document_type: 'return',
      ambiente: 1,
      modelo: '55',
    };
    setupQuery([returnDoc]);

    const result = await findAuthorizedFiscalDocument('sale-123');
    expect(result).toBeNull();
  });

  it('ignora documentos não autorizados (ex: cancelada, rejeitada)', async () => {
    const cancelledDoc = {
      id: 'doc-cancelled',
      order_id: 'sale-123',
      status: 'cancelada',
      document_type: 'outbound',
      ambiente: 1,
      modelo: '55',
    };
    setupQuery([cancelledDoc]);

    const result = await findAuthorizedFiscalDocument('sale-123');
    expect(result).toBeNull();
  });
});
