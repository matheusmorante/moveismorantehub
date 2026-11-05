import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

const mockDb = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  realtimeCallback: { current: undefined as (() => void) | undefined },
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mockDb }));

import {
  fetchAllOrdersForDashboard,
  fetchGeoMapOrders,
  fetchOrdersPage,
  fetchRecentOrders,
  fetchScheduledAndDraftOrders,
  subscribeToOrderChanges,
} from '../orderSyncQueries';

afterEach(() => {
  vi.useRealTimers();
});

describe('dashboard order projections', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
    mockDb.rpc.mockReset();
  });

  it('returns the narrow recent-order fields consumed by the dashboard card', async () => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.not = vi.fn(() => query);
    query.in = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.limit = vi.fn(() => query);
    query.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [{ id: 'recent-1', order_number: 12, order_index: 34, status: 'scheduled', order_type: 'sale', customer_name: 'Cliente', total_amount: 125, created_at: '2026-10-10' }],
        error: null,
      }).then(resolve);
    mockDb.from.mockReturnValue(query);

    await expect(fetchRecentOrders(5)).resolves.toEqual([
      expect.objectContaining({
        id: 'recent-1',
        orderIndex: 34,
        customerData: { fullName: 'Cliente' },
        totalAmount: 125,
        date: '2026-10-10',
      }),
    ]);
  });

  it('preserves address and sale value in the geographic-map projection', async () => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.in = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.limit = vi.fn(() => query);
    query.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [{
          id: 'map-1',
          total_amount: 275,
          status: 'scheduled',
          order_type: 'sale',
          customer_name: 'Cliente do mapa',
          order_data: {
            customerData: { fullName: 'Cliente do mapa', fullAddress: { street: 'Rua A', city: 'Curitiba' } },
            shipping: { destinationCoords: [-49.2, -25.4] },
            itemsSummary: { itemsTotalValue: 250 },
          },
        }],
        error: null,
      }).then(resolve);
    mockDb.from.mockReturnValue(query);

    const [order] = await fetchGeoMapOrders(50);

    expect(order.customerData.fullAddress?.street).toBe('Rua A');
    expect(order.shipping?.destinationCoords).toEqual([-49.2, -25.4]);
    expect(order.itemsSummary?.itemsTotalValue).toBe(250);
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining('testArtifact'));
    expect(query.or.mock.invocationCallOrder[0]).toBeLessThan(
      query.limit.mock.invocationCallOrder[0]
    );
  });

  it('propagates dashboard read errors instead of caching an empty result', async () => {
    const error = new Error('leitura indisponível');
    const query: any = {};
    query.select = vi.fn(() => query);
    query.in = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.limit = vi.fn(() => query);
    query.gte = vi.fn(() => query);
    query.lte = vi.fn(() => query);
    query.range = vi.fn().mockResolvedValue({ data: null, error });
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error }).then(resolve);
    mockDb.from.mockReturnValue(query);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(fetchRecentOrders()).resolves.toEqual([]);
    await expect(fetchRecentOrders(5, { throwOnError: true })).rejects.toBe(error);
    await expect(fetchGeoMapOrders(50, { throwOnError: true })).rejects.toBe(error);
    await expect(fetchAllOrdersForDashboard(undefined, { throwOnError: true })).rejects.toBe(error);
  });

  it('preserves the scheduled-order fallback and supports strict dashboard reads', async () => {
    const error = new Error('agendamentos indisponíveis');
    mockDb.rpc.mockResolvedValue({ data: null, error });
    const query: any = {};
    query.select = vi.fn(() => query);
    query.in = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error }).then(resolve);
    mockDb.from.mockReturnValue(query);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(fetchScheduledAndDraftOrders()).resolves.toEqual([]);
    await expect(fetchScheduledAndDraftOrders({ throwOnError: true })).rejects.toBe(error);
  });
});

describe('fetchOrdersPage', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
    mockDb.rpc.mockReset();
  });

  it('preserva ordem e total do servidor e carrega somente resumos dos IDs selecionados', async () => {
    mockDb.rpc.mockResolvedValueOnce({
      data: { ids: ['order-2', 'order-1'], total: 31, totalAmount: 2900 }, error: null,
    }).mockResolvedValueOnce({ data: [
      { id: 'order-1', __orderSummary: true, status: 'scheduled', order_type: 'sale', order_number: '1', customer_name: 'Ana', order_data: { __orderSummary: true } },
      { id: 'order-2', __orderSummary: true, status: 'scheduled', order_type: 'sale', order_number: '2', customer_name: 'Bia', order_data: { __orderSummary: true } },
    ], error: null });
    const filters = { customerName: 'bia ana', productName: 'mesa', seller: 'joao', dateRange: { start: '2026-01-01', end: '2026-12-31' } };
    const result = await fetchOrdersPage(2, 100, filters, { throwOnError: true });
    expect(mockDb.rpc).toHaveBeenCalledWith('list_order_page_ids', { p_filters: filters, p_page: 2, p_page_size: 15, p_mode: 'erp' });
    expect(mockDb.rpc).toHaveBeenCalledWith('read_order_summaries', { p_ids: ['order-2', 'order-1'] });
    expect(result.orders.map((order) => order.id)).toEqual(['order-2', 'order-1']);
    expect(result.orders.every((order) => order.__orderSummary)).toBe(true);
    expect(result).toMatchObject({ total: 31, totalAmount: 2900 });
  });

  it('não consulta os detalhes quando a página filtrada está vazia', async () => {
    mockDb.rpc.mockResolvedValue({ data: { ids: [], total: 0, totalAmount: 0 }, error: null });
    await expect(fetchOrdersPage(1, 15, { customerName: 'não encontrado' }, { throwOnError: true }))
      .resolves.toEqual({ orders: [], total: 0, totalAmount: 0 });
    expect(mockDb.from).not.toHaveBeenCalled();
  });

  it('propaga falha e resposta inválida sem carregar todos os pedidos', async () => {
    const failure = new Error('falha de leitura');
    mockDb.rpc.mockResolvedValueOnce({ data: null, error: failure });
    await expect(fetchOrdersPage(1, 15, {}, { throwOnError: true })).rejects.toBe(failure);
    mockDb.rpc.mockResolvedValueOnce({ data: { ids: ['duplicado', 'duplicado'], total: 2, totalAmount: 0 }, error: null });
    await expect(fetchOrdersPage(1, 15, {}, { throwOnError: true })).rejects.toThrow('página inválida');
    expect(mockDb.from).not.toHaveBeenCalled();
  });

  it('permite nova tentativa após falha da consulta filtrada', async () => {
    const failure = new Error('falha temporária');
    mockDb.rpc.mockResolvedValueOnce({ data: null, error: failure })
      .mockResolvedValueOnce({ data: { ids: [], total: 0, totalAmount: 0 }, error: null });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const queryOptions = {
      queryKey: ['orders', { customerName: 'cliente-sintetico' }],
      queryFn: () => fetchOrdersPage(1, 15, { customerName: 'cliente-sintetico' }, { throwOnError: true }),
    };
    await expect(queryClient.fetchQuery(queryOptions)).rejects.toBe(failure);
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    await expect(queryClient.fetchQuery(queryOptions)).resolves.toEqual({ orders: [], total: 0, totalAmount: 0 });
    expect(mockDb.rpc).toHaveBeenCalledTimes(2);
  });
});

describe('fetchScheduledAndDraftOrders', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
    mockDb.rpc.mockReset();
  });

  it('preserva pagamentos normalizados e valores pago/em aberto na agenda compacta', async () => {
    mockDb.rpc.mockResolvedValueOnce({ data: { ids: ['scheduled-order-1'], total: 1 }, error: null })
      .mockResolvedValueOnce({ data: [{
        id: 'scheduled-order-1', __orderSummary: true, order_number: '1042', status: 'scheduled',
        order_type: 'sale', total_amount: 1045, order_data: { __orderSummary: true },
        order_payments: [{ payment_index: 1, payment_method: 'Pix', amount: '600.00', fee: '5.00', fee_type: 'fixed', status: 'PAGO', installments: 1 }],
      }], error: null });
    const orders = await fetchScheduledAndDraftOrders({ throwOnError: true });
    expect(mockDb.rpc).toHaveBeenCalledWith('list_order_schedule_ids', expect.objectContaining({ p_scope: 'erp_schedule', p_filters: { types: ['delivery', 'pickup', 'assistance'] } }));
    expect(mockDb.rpc).toHaveBeenCalledWith('read_order_summaries', { p_ids: ['scheduled-order-1'] });
    expect(orders[0].payments).toEqual([expect.objectContaining({ method: 'Pix', amount: 600, fee: 5, status: 'PAGO' })]);
    expect(orders[0].paymentsSummary.totalAmountPaid).toBe(605);
    expect(orders[0].paymentsSummary.amountRemaining).toBe(440);
  });
});

describe('fetchAllOrdersForDashboard', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
    mockDb.rpc.mockReset();
  });

  it('excludes marked HML fiscal fixtures from dashboard reads', async () => {
    const selectedColumns: string[] = [];
    const query: any = {};
    query.select = vi.fn((columns: string) => {
      selectedColumns.push(columns);
      return query;
    });
    query.or = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn(() => query);
    query.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [
          {
            id: 'hml-test-order',
            status: 'pending',
            order_type: 'sale',
            is_test: 'true',
            test_environment: 'homologation',
            test_run_id: 'f8ab08d6-c1c5-45a6-9e91-9b54d56e3f4d',
            order_items: [],
          },
          {
            id: 'regular-order',
            status: 'scheduled',
            order_type: 'sale',
            created_at: '2026-10-02T01:00:00.000Z',
            order_date: '2026-10-01T03:00:00.000Z',
            shipping_data: { distance: 12.5 },
            order_items: [],
          },
        ],
        error: null,
      }).then(resolve);
    mockDb.rpc.mockReturnValue(query);

    const orders = await fetchAllOrdersForDashboard({
      start: new Date('2026-10-01T00:00:00.000Z'),
      end: new Date('2026-10-05T23:59:59.999Z'),
    });

    expect(selectedColumns[0]).toContain('test_run_id:order_data->>testRunId');
    expect(selectedColumns[0]).toContain('shipping_data:order_data->shipping');
    expect(selectedColumns[0]).toContain('order_date:order_data->>date');
    expect(mockDb.rpc).toHaveBeenCalledWith('get_dashboard_orders_by_effective_date', {
      p_start: '2026-10-01T00:00:00.000Z',
      p_end: '2026-10-05T23:59:59.999Z',
    });
    expect(orders.map((order) => order.id)).toEqual(['regular-order']);
    expect(orders[0].date).toBe('2026-10-01T03:00:00.000Z');
    expect(orders[0].shipping.distance).toBe(12.5);
  });
});

describe('subscribeToOrderChanges', () => {
  beforeEach(() => {
    mockDb.channel.mockReset().mockImplementation(() => {
      const channel: any = {};
      channel.on = vi.fn((_event: string, _filter: unknown, callback: () => void) => {
        mockDb.realtimeCallback.current = callback;
        return channel;
      });
      channel.subscribe = vi.fn(() => channel);
      return channel;
    });
    mockDb.removeChannel.mockReset().mockResolvedValue(undefined);
    mockDb.realtimeCallback.current = undefined;
  });

  it('coalesces a burst of Realtime events before invalidating paginated queries', async () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribeToOrderChanges(listener);
    const notify = mockDb.realtimeCallback.current;

    expect(notify).toBeTypeOf('function');
    notify?.();
    notify?.();
    notify?.();
    expect(listener).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2999);
    expect(listener).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    expect(mockDb.removeChannel).toHaveBeenCalledOnce();
  });
});
