import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = {
  select: vi.fn(),
  neq: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  or: vi.fn(),
  in: vi.fn(),
};

vi.mock('../../../services/supabaseClient', () => ({
  supabase: { from: vi.fn(() => query) },
}));

vi.mock('../../../repositories/OrderRepository', () => ({
  OrderRepository: { saveLocal: vi.fn() },
}));

import { fetchMobileOrdersPage, resolveMobileFiscalBadgePair } from './mobileOrderListService';

describe('fetchMobileOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    query.select.mockReturnValue(query);
    query.neq.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.in.mockReturnValue(query);

    query.range.mockResolvedValue({
      count: 1,
      error: null,
      data: [
        {
          id: 'order-1',
          order_number: '1001',
          status: 'scheduled',
          order_type: 'sale',
          customer_name: 'Cliente Teste',
          total_value: 100,
          scheduled_date: '2026-09-08',
          pending_scheduling: false,
          order_data: { items: [{ quantity: 1 }] },
        },
      ],
    });
  });

  it('uses the normalized operational view and keeps the remote order when local cache fails', async () => {
    const { OrderRepository } = await import('../../../repositories/OrderRepository');
    vi.mocked(OrderRepository.saveLocal).mockRejectedValueOnce(
      new Error('SQLite ainda não inicializado')
    );

    const result = await fetchMobileOrdersPage({
      page: 1,
      pageSize: 400,
      search: '',
      status: 'all',
    });

    expect(result.total).toBe(1);
    expect(result.items[0].order_data.shipping).toMatchObject({
      scheduling: { date: '2026-09-08' },
    });
    expect(query.neq).toHaveBeenCalledWith('order_type', 'budget');
  });

  it('does not return budgets even when a legacy row reaches the response', async () => {
    query.range.mockResolvedValueOnce({
      count: 2,
      error: null,
      data: [
        {
          id: 'order-sale',
          order_number: '1001',
          status: 'scheduled',
          order_type: 'sale',
          customer_name: 'Venda',
          total_value: 100,
          order_data: {},
        },
        {
          id: 'order-budget',
          order_number: '1002',
          status: 'draft',
          order_type: 'budget',
          customer_name: 'Orçamento',
          total_value: 200,
          order_data: {},
        },
      ],
    });

    const result = await fetchMobileOrdersPage({
      page: 1,
      pageSize: 15,
      search: '',
      status: 'all',
    });

    expect(result.total).toBe(1);
    expect(result.items.map((item) => item.id)).toEqual(['order-sale']);
  });

  it('does not query orders again when the optimized view returns a valid empty page', async () => {
    query.range.mockResolvedValueOnce({ count: 0, error: null, data: [] });
    const { supabase } = await import('../../../services/supabaseClient');

    const result = await fetchMobileOrdersPage({
      page: 1,
      pageSize: 15,
      search: '',
      status: 'all',
    });

    expect(result).toEqual({ items: [], total: 0 });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith('order_list_items');
  });

  it('filters by status cancelados calling query.or with cancelled patterns', async () => {
    await fetchMobileOrdersPage({
      page: 1,
      pageSize: 15,
      search: '',
      status: 'cancelados',
    });

    expect(query.or).toHaveBeenCalledWith(
      'status.ilike.%cancelled%,status.ilike.%cancelad%'
    );
  });

  it('maps operational metadata like stock check, bling, stock processing and linked orders', async () => {
    query.range.mockResolvedValueOnce({
      count: 1,
      error: null,
      data: [
        {
          id: 'order-op-1',
          order_number: '5001',
          status: 'scheduled',
          order_type: 'sale',
          customer_name: 'Cliente Operacional',
          total_value: 350,
          is_stock_checked: true,
          is_registered_in_bling: true,
          stock_processed: true,
          stock_reversed: false,
          return_order_id: 'ret-100',
          return_kind: 'partial',
          linked_order_id: 'orig-200',
          linked_order_code: '200',
          order_data: {},
        },
      ],
    });

    const result = await fetchMobileOrdersPage({
      page: 1,
      pageSize: 15,
      search: '',
      status: 'all',
    });

    expect(result.items[0]).toMatchObject({
      is_stock_checked: true,
      is_registered_in_bling: true,
      stock_processed: true,
      stock_reversed: false,
      return_order_id: 'ret-100',
      return_kind: 'partial',
      linked_order_id: 'orig-200',
      linked_order_code: '200',
    });
  });

  it('resolves fiscal badges with estorno (NFE) and devolução (NFD)', () => {
    const badges = resolveMobileFiscalBadgePair([
      {
        order_id: 'order-1',
        status: 'autorizada',
        document_type: 'outbound',
        ambiente: 1,
      },
      {
        order_id: 'order-1',
        status: 'autorizada',
        document_type: 'estorno',
        ambiente: 1,
      },
      {
        order_id: 'order-1',
        status: 'autorizada',
        document_type: 'return',
        ambiente: 1,
      },
    ]);

    expect(badges.production).toBe('reversed');
    expect(badges.estornoStatus).toBe('issued');
    expect(badges.devolucaoStatus).toBe('issued');
    expect(badges.devolucaoCount).toBe(1);
  });

  it('resolves fiscalCancellationState as pending when order is cancelled but fiscal doc was authorized without estorno', () => {
    const badges = resolveMobileFiscalBadgePair(
      [
        {
          order_id: 'order-canc',
          status: 'autorizada',
          document_type: 'outbound',
          ambiente: 1,
        },
      ],
      true
    );

    expect(badges.fiscalCancellationState).toBe('pending');
  });

  it('filters by status retiradas and assistencias', async () => {
    await fetchMobileOrdersPage({
      page: 1,
      pageSize: 15,
      search: '',
      status: 'retiradas',
    });
    expect(query.or).toHaveBeenCalledWith(
      'delivery_method.ilike.%pickup%,delivery_method.ilike.%retirada%'
    );

    await fetchMobileOrdersPage({
      page: 1,
      pageSize: 15,
      search: '',
      status: 'assistencias',
    });
    expect(query.eq).toHaveBeenCalledWith('order_type', 'assistance');
  });
});

