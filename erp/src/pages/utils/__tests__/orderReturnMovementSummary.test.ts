import { afterEach, describe, expect, it, vi } from 'vitest';
import type Order from '../../types/order.type';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../supabaseConfig', () => ({ supabase: { from: mocks.from } }));
import { enrichLinkedReturnMovements, summarizeReceivedReturns, type LinkedReturnRow } from '../orderSyncQueries/orderReturnMovementSummary';
import { mapOrderFromDatabase } from '../orderMapper';
import { getPersistedOrderDataSnapshot } from '../orderMapper/orderSnapshots';
import { buildOrderPersistencePayload } from '../orderPersistencePayload';
const item = { productId: 'product', variationId: 'variation', description: 'Armário', quantity: 3, unitPrice: 100 };
const sale = () => ({ id: 'sale', orderType: 'sale', status: 'fulfilled', items: [item], returnOrderId: 'cancelled-return', returnKind: 'complete' }) as Order;
const received = { id: 'received', linked_order_id: 'sale', status: 'fulfilled', stock_processed: true, items: [{ ...item, quantity: 1, originalOrderItemIndex: 0 }] } as LinkedReturnRow;
const cancelled = { id: 'cancelled-return', linked_order_id: 'sale', status: 'cancelled', items: [{ ...item, quantity: 2, originalOrderItemIndex: 0 }] } as LinkedReturnRow;
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });

describe('resumo físico das devoluções irmãs', () => {
  it('não confunde vínculo histórico cancelado ou reserva futura com retorno integral', () => {
    const order = sale();
    for (const status of ['cancelled', 'scheduled']) {
      const summary = summarizeReceivedReturns(order, [received, { ...cancelled, status }]);
      expect(summary).toMatchObject({ returnKind: 'partial', stockProcessed: true, items: [expect.objectContaining({ quantity: 1 })] });
    }
    expect(order.returnKind).toBe('complete');
    expect(order.items[0].quantity).toBe(3);
    expect(summarizeReceivedReturns(order, [{ ...cancelled, status: 'scheduled' }]).returnKind).toBeUndefined();
  });
  it('soma irmãos recebidos e conserva identidade de linhas repetidas', () => {
    expect(summarizeReceivedReturns(sale(), [received, { ...received, id: 'other', items: cancelled.items }])).toMatchObject({ returnKind: 'complete', items: [expect.objectContaining({ quantity: 3 })] });
    const repeated = { ...sale(), items: [{ ...item, quantity: 2 }, { ...item, quantity: 2 }] } as Order;
    expect(summarizeReceivedReturns(repeated, [{ ...received, items: [{ ...item, quantity: 2, originalOrderItemIndex: 1 }] as never }])).toMatchObject({ returnKind: 'partial', items: [expect.objectContaining({ quantity: 2, originalOrderItemIndex: 1 })] });
  });
  it.each(['ok', 'error', 'truncated'])('consulta todos os vínculos, deduplica e preserva o snapshot persistido (%s)', async mode => {
    const raw = { ...sale(), customerData: {}, paymentsSummary: { totalOrderValue: 300 } };
    const order = mapOrderFromDatabase({ id: 'sale', status: 'fulfilled', order_type: 'sale', order_data: raw });
    const calls: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.from.mockImplementation(() => {
      const query: any = { select: () => query, eq: () => query,
        in: (column: string) => { calls.push(column); return query; },
        limit: async () => ({ data: [received, cancelled], count: mode === 'truncated' ? 3 : 2, error: mode === 'error' ? { message: 'offline' } : null }),
      };
      return query;
    });
    await enrichLinkedReturnMovements([order]);
    expect(calls).toEqual(['linked_order_id', 'order_data->>linkedOrderId', 'id']);
    expect(order.linkedReturnMovement).toMatchObject(mode === 'ok' ? { returnKind: 'partial', items: [expect.objectContaining({ quantity: 1 })] } : { status: 'unknown' });
    expect(getPersistedOrderDataSnapshot(order)).toBe(raw);
    expect(raw.returnKind).toBe('complete');
    const payload = buildOrderPersistencePayload(order);
    expect(payload.order_data).not.toHaveProperty('linkedReturnMovement');
    expect(order.linkedReturnMovement).toBeDefined();
  });
});
