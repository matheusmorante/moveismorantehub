import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatOrderCode, formatOrderTotal, getOrderTotalValue } from '../../../utils/orderUtils';

const query = {
  select: vi.fn(),
  in: vi.fn(),
};

const rpc = vi.fn();

vi.mock('../../../services/supabaseClient', () => ({
  supabase: { from: vi.fn(() => query), rpc: (...args: any[]) => rpc(...args) },
}));

vi.mock('../../../repositories/OrderRepository', () => ({
  OrderRepository: {
    init: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    saveLocal: vi.fn().mockResolvedValue(undefined),
    overlayPendingLocalOrders: vi.fn(async (items) => items),
  },
}));

vi.mock('../../../services/offline/offlineStorageService', () => ({
  offlineStorageService: { getWorkingSet: vi.fn().mockResolvedValue(null), cacheWorkingSet: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../../services/offline/orderSnapshotCache', () => ({ refreshOfflineOrderSnapshots: async () => undefined }));
import { fetchMobileOrdersPage } from './mobileOrderListService';

describe('Mobile Orders Resilience & Zero-Value Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    query.select.mockReturnValue(query);
    rpc.mockImplementation(async (name) => name === 'list_order_page_ids'
      ? { data: { ids: ['order-1'], total: 1, totalAmount: 2206 }, error: null }
      : { ...(await query.in()), data: (await query.in()).data.map((row: any) => ({ ...row, __orderSummary: true, order_data: { ...row.order_data, __orderSummary: true } })) });
    query.in.mockResolvedValue({
      error: null,
      data: [
        {
          id: 'order-1',
          order_number: '3212',
          status: 'scheduled',
          order_type: 'sale',
          customer_name: 'Andreia Fernandes',
          total_value: 2206,
          scheduled_date: '2026-09-26',
          deleted: false,
          order_data: {
            orderIndex: 3212,
            paymentsSummary: { totalOrderValue: 2206 },
            items: [{ name: 'Guarda Roupa', unitPrice: 2206, quantity: 1 }],
          },
        },
      ],
    });
  });

  it('usa os pedidos selecionados pelo servidor e preserva códigos e totais', async () => {
    const result = await fetchMobileOrdersPage({
      page: 1,
      pageSize: 15,
      search: '',
      status: 'all',
    });

    expect(result.items.length).toBe(1);
    expect(rpc).toHaveBeenCalledWith('read_order_summaries', { p_ids: ['order-1'] });
    expect(result.items[0].id).toBe('order-1');
    expect(result.items[0].customer_name).toBe('Andreia Fernandes');
    expect(result.items[0].total_value).toBe(2206);

    const code = formatOrderCode(result.items[0]);
    expect(code).toBe('003212');

    const totalStr = formatOrderTotal(result.items[0]);
    expect(totalStr).toBe('R$ 2.206,00');
  });

  it('correctly extracts total value across multiple fallback sources without defaulting to zero', () => {
    // 1. From paymentsSummary
    expect(getOrderTotalValue({ order_data: { paymentsSummary: { totalOrderValue: 1500 } } })).toBe(
      1500
    );

    // 2. From top-level total_value
    expect(getOrderTotalValue({ total_value: 850 })).toBe(850);

    // 3. From top-level total_amount
    expect(getOrderTotalValue({ total_amount: 1200 })).toBe(1200);

    // 4. From item lines
    expect(
      getOrderTotalValue({
        order_data: {
          items: [
            { unitPrice: 200, quantity: 2 },
            { price: 100, quantity: 1 },
          ],
        },
      })
    ).toBe(500);

    // 5. From legacy total
    expect(getOrderTotalValue({ order_data: { total: 349 } })).toBe(349);
  });

  it('formats order code gracefully from various order representations', () => {
    expect(formatOrderCode({ order_number: '2523' })).toBe('002523');
    expect(formatOrderCode({ order_data: { orderIndex: 3207 } })).toBe('003207');
    expect(formatOrderCode({ order_index: '1848' })).toBe('001848');
  });
});
