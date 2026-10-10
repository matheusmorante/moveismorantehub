import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

const mockDb = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mockDb }));

import {
  fetchAllOrdersForDashboard,
  fetchGeoMapOrders,
  fetchOrdersPage,
  fetchRecentOrders,
  fetchScheduledAndDraftOrders,
} from '../orderSyncQueries';

describe('dashboard order projections', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
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
  });
});

describe('fetchOrdersPage', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
  });

  it('selects mapper fields explicitly and projects only consumed child columns', async () => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.not = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.ilike = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn().mockResolvedValue({ data: [], count: 0, error: null });
    mockDb.from.mockReturnValue(query);

    await fetchOrdersPage();

    const [columns, options] = query.select.mock.calls[0];
    expect(options).toEqual({ count: 'exact' });
    expect(columns).toContain('items, order_data');
    expect(columns).toContain('order_items(');
    expect(columns).toContain('item_snapshot');
    expect(columns).toContain('original_total_value');
    expect(columns).toContain('order_payments(payment_method, amount, fee, fee_type, status, installments)');
    expect(columns).not.toMatch(/order_items\s*\(\s*\*\s*\)/);
    expect(columns).not.toMatch(/order_payments\s*\(\s*\*\s*\)/);
  });

  it('preserves the legacy empty result by default and propagates failures for query hooks', async () => {
    const queryError = new Error('falha de leitura');
    const query: any = {};
    query.select = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.not = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.ilike = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi.fn().mockResolvedValue({ data: null, count: null, error: queryError });
    mockDb.from.mockReturnValue(query);

    await expect(fetchOrdersPage()).resolves.toEqual({ orders: [], total: 0 });
    await expect(fetchOrdersPage(1, 15, undefined, { throwOnError: true })).rejects.toBe(queryError);
  });

  it('recovers a failed order query when it is invalidated and retried', async () => {
    const queryError = new Error('falha temporária ao carregar pedidos');
    const query: any = {};
    query.select = vi.fn(() => query);
    query.or = vi.fn(() => query);
    query.not = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.ilike = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.range = vi
      .fn()
      .mockResolvedValueOnce({ data: null, count: null, error: queryError })
      .mockResolvedValueOnce({ data: [], count: 0, error: null });
    mockDb.from.mockReturnValue(query);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const queryOptions = {
      queryKey: ['orders', { customerName: 'cliente-sintetico' }],
      queryFn: () => fetchOrdersPage(1, 15, { customerName: 'cliente-sintetico' }, { throwOnError: true }),
    };

    await expect(queryClient.fetchQuery(queryOptions)).rejects.toBe(queryError);
    await queryClient.invalidateQueries({ queryKey: ['orders'] });
    await expect(queryClient.fetchQuery(queryOptions)).resolves.toEqual({ orders: [], total: 0 });
    expect(query.range).toHaveBeenCalledTimes(2);
  });
});

describe('fetchScheduledAndDraftOrders', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
  });

  it('carrega as formas de pagamento da agenda e calcula corretamente pago e em aberto', async () => {
    let selectedColumns = '';
    const query: any = {
      select: vi.fn((columns: string) => {
        selectedColumns = columns;
        return query;
      }),
      or: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: [
            {
              id: 'scheduled-order-1',
              order_number: '1042',
              status: 'scheduled',
              order_type: 'sale',
              total_amount: 1045,
              order_items: [],
              order_payments: [
                {
                  payment_index: 1,
                  payment_method: 'Pix',
                  amount: '600.00',
                  fee: '5.00',
                  fee_type: 'fixed',
                  status: 'PAGO',
                  installments: 1,
                },
              ],
            },
          ],
          error: null,
        }).then(resolve),
    };
    mockDb.from.mockReturnValue(query);

    const orders = await fetchScheduledAndDraftOrders();

    expect(selectedColumns).toContain('order_payments(');
    expect(orders[0].payments).toEqual([
      expect.objectContaining({ method: 'Pix', amount: 600, fee: 5, status: 'PAGO' }),
    ]);
    expect(orders[0].paymentsSummary.totalAmountPaid).toBe(605);
    expect(orders[0].paymentsSummary.amountRemaining).toBe(440);
  });
});

describe('fetchAllOrdersForDashboard', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
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
    query.gte = vi.fn(() => query);
    query.lte = vi.fn(() => query);
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
            order_items: [],
          },
        ],
        error: null,
      }).then(resolve);
    mockDb.from.mockReturnValue(query);

    const orders = await fetchAllOrdersForDashboard({
      start: new Date('2026-10-01T00:00:00.000Z'),
      end: new Date('2026-10-05T23:59:59.999Z'),
    });

    expect(selectedColumns[0]).toContain('test_run_id:order_data->>testRunId');
    expect(orders.map((order) => order.id)).toEqual(['regular-order']);
  });
});
