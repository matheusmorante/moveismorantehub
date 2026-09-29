import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mockDb }));

import { fetchScheduledAndDraftOrders } from '../orderSyncQueries';

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
