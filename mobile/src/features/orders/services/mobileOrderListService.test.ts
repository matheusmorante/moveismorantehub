import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = {
  select: vi.fn(), order: vi.fn(), range: vi.fn(), or: vi.fn(),
};

vi.mock('../../../services/supabaseClient', () => ({
  supabase: { from: vi.fn(() => query) },
}));

vi.mock('../../../repositories/OrderRepository', () => ({
  OrderRepository: { saveLocal: vi.fn() },
}));

import { fetchMobileOrdersPage } from './mobileOrderListService';

describe('fetchMobileOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    query.select.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({
      count: 1,
      error: null,
      data: [{
        id: 'order-1', order_number: '1001', status: 'scheduled', order_type: 'sale',
        customer_name: 'Cliente Teste', total_value: 100, scheduled_date: '2026-09-08',
        pending_scheduling: false, order_data: { items: [{ quantity: 1 }] },
      }],
    });
  });

  it('uses the normalized operational view and keeps the remote order when local cache fails', async () => {
    const { OrderRepository } = await import('../../../repositories/OrderRepository');
    vi.mocked(OrderRepository.saveLocal).mockRejectedValueOnce(new Error('SQLite ainda não inicializado'));

    const result = await fetchMobileOrdersPage({ page: 1, pageSize: 400, search: '', status: 'all' });

    expect(result.total).toBe(1);
    expect(result.items[0].order_data.shipping).toMatchObject({ scheduling: { date: '2026-09-08' } });
  });
});
