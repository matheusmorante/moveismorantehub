import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mockDb }));

import { fetchAllOrdersForDashboard, fetchScheduledAndDraftOrders } from '../orderSyncQueries';

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
