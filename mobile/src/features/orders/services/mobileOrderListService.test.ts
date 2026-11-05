import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  saveLocal: vi.fn(),
  overlayPendingLocalOrders: vi.fn(), cache: vi.fn(), cacheRead: vi.fn(),
}));
vi.mock('../../../services/supabaseClient', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));
vi.mock('../../../repositories/OrderRepository', () => ({
  OrderRepository: { saveLocal: mocks.saveLocal, overlayPendingLocalOrders: mocks.overlayPendingLocalOrders },
}));

vi.mock('../../../services/offline/offlineStorageService', () => ({
  offlineStorageService: { getWorkingSet: mocks.cacheRead, cacheWorkingSet: mocks.cache },
}));
vi.mock('../../../services/offline/orderSnapshotCache', () => ({ refreshOfflineOrderSnapshots: async () => undefined }));
import { fetchMobileOrdersPage, resolveMobileFiscalBadgePair } from './mobileOrderListService';

describe('listagem de pedidos do aplicativo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    mocks.cacheRead.mockResolvedValue(null); mocks.cache.mockResolvedValue(undefined);
    mocks.saveLocal.mockReset().mockResolvedValue(undefined);
    mocks.overlayPendingLocalOrders.mockReset().mockImplementation(async (items) => items);
  });

  it('envia busca, status e tipo ao servidor e busca apenas os IDs da página', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { ids: ['sale-2', 'sale-1'], total: 32, totalAmount: 500 }, error: null,
    }).mockResolvedValueOnce({ data: [
      { id: 'sale-1', __orderSummary: true, order_number: '1', order_type: 'sale', status: 'scheduled', order_data: { __orderSummary: true } },
      { id: 'sale-2', __orderSummary: true, order_number: '2', order_type: 'sale', status: 'scheduled', order_data: { __orderSummary: true } },
    ], error: null });
    const query: any = {};
    query.select = vi.fn(() => query);
    query.in = vi.fn().mockResolvedValue({
      data: [
        { id: 'sale-1', order_number: '1', order_type: 'sale', status: 'scheduled', order_data: {} },
        { id: 'sale-2', order_number: '2', order_type: 'sale', status: 'scheduled', order_data: {} },
      ], error: null,
    });
    mocks.from.mockReturnValue(query);
    const result = await fetchMobileOrdersPage({
      page: 2, pageSize: 400, search: 'florenca ana', status: 'agendados', orderType: 'sale',
    });
    expect(mocks.rpc).toHaveBeenCalledWith('list_order_page_ids', {
      p_filters: { orderType: 'sale', mobileSearch: 'florenca ana', mobileStatus: 'agendados' },
      p_page: 2, p_page_size: 15, p_mode: 'mobile',
    });
    expect(mocks.rpc).toHaveBeenCalledWith('read_order_summaries', { p_ids: ['sale-2', 'sale-1'] });
    expect(result.items.map((item) => item.id)).toEqual(['sale-2', 'sale-1']);
    expect(mocks.saveLocal).not.toHaveBeenCalled();
    expect(mocks.cache).toHaveBeenCalledWith('order_list_summaries', expect.arrayContaining([expect.objectContaining({ id: 'sale-1' })]));
    expect(result.total).toBe(32);
  });

  it('não busca detalhes para uma página vazia nem inventa resultados em erro', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { ids: [], total: 0, totalAmount: 0 }, error: null });
    await expect(fetchMobileOrdersPage({ page: 1, pageSize: 15, search: '', status: 'all' }))
      .resolves.toEqual({ items: [], total: 0 });
    expect(mocks.from).not.toHaveBeenCalled();
    const error = new Error('servidor indisponível');
    mocks.rpc.mockResolvedValueOnce({ data: null, error });
    await expect(fetchMobileOrdersPage({ page: 1, pageSize: 15, search: '', status: 'all' }))
      .rejects.toBe(error);
  });

  it('mantém dados operacionais e a resposta remota mesmo se o cache local falhar', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { ids: ['order-1'], total: 1, totalAmount: 350 }, error: null })
      .mockResolvedValueOnce({ data: [{
        id: 'order-1', __orderSummary: true, order_number: '5001', status: 'scheduled', order_type: 'sale', customer_name: 'Cliente',
        total_amount: 350, is_stock_checked: true, stock_processed: true, return_order_id: 'ret-100', return_kind: 'partial',
        linked_order_id: 'orig-200', version: 7, order_data: { __orderSummary: true, isRegisteredInBling: true, is_registered_in_bling: true },
      }], error: null });
    mocks.cache.mockRejectedValueOnce(new Error('SQLite indisponível'));
    const query: any = {};
    query.select = vi.fn(() => query);
    query.in = vi.fn().mockResolvedValue({
      data: [{
        id: 'order-1', order_number: '5001', status: 'scheduled', order_type: 'sale',
        customer_name: 'Cliente', total_amount: 350, is_stock_checked: true, stock_processed: true,
        return_order_id: 'ret-100', return_kind: 'partial', linked_order_id: 'orig-200', version: 7,
        order_data: { isRegisteredInBling: true, is_registered_in_bling: true },
      }], error: null,
    });
    mocks.from.mockReturnValue(query);
    vi.spyOn(console, 'warn').mockImplementationOnce(() => undefined);
    const result = await fetchMobileOrdersPage({ page: 1, pageSize: 15, search: '', status: 'all' });
    expect(result.items[0]).toMatchObject({
      is_stock_checked: true, stock_processed: true, return_order_id: 'ret-100',
      return_kind: 'partial', linked_order_id: 'orig-200', version: 7,
    });
    expect(result.items[0].order_data).not.toHaveProperty('isRegisteredInBling');
    expect(result.items[0].order_data).not.toHaveProperty('is_registered_in_bling');
  });

  it('mantém separados orçamento, assistência e devolução na consulta remota', async () => {
    mocks.rpc.mockResolvedValue({ data: { ids: [], total: 0, totalAmount: 0 }, error: null });
    for (const orderType of ['budget', 'assistance', 'return'] as const) {
      await fetchMobileOrdersPage({ page: 1, pageSize: 15, search: '', status: 'all', orderType });
      expect(mocks.rpc).toHaveBeenLastCalledWith('list_order_page_ids', expect.objectContaining({
        p_filters: expect.objectContaining({ orderType }),
      }));
    }
  });

  it('resolve os selos de estorno e devolução fiscal', () => {
    const badges = resolveMobileFiscalBadgePair([
      { order_id: 'order-1', status: 'autorizada', document_type: 'outbound', ambiente: 1 },
      { order_id: 'order-1', status: 'autorizada', document_type: 'estorno', ambiente: 1 },
      { order_id: 'order-1', status: 'autorizada', document_type: 'return', ambiente: 1 },
    ]);
    expect(badges).toMatchObject({
      production: 'reversed', estornoStatus: 'issued', devolucaoStatus: 'issued', devolucaoCount: 1,
    });
  });

  it('mantém pendente o cancelamento fiscal sem estorno autorizado', () => {
    const badges = resolveMobileFiscalBadgePair([
      { order_id: 'order-canc', status: 'autorizada', document_type: 'outbound', ambiente: 1 },
    ], true);
    expect(badges.fiscalCancellationState).toBe('pending');
  });
});

