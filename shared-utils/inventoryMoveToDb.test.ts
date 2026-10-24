import { describe, expect, it } from 'vitest';
import { toInventoryMoveDatabaseRow } from './inventoryMoveToDb';

const baseMove = {
  productId: 'product-1',
  variationId: 'variation-1',
  productDescription: 'Cadeira azul',
  quantity: 4,
  date: '2026-10-24T12:00:00.000Z',
};

describe('toInventoryMoveDatabaseRow', () => {
  it.each([
    ['entry', 'entry'],
    ['exit', 'exit'],
    ['withdrawal', 'exit'],
    ['adjustment', 'adjustment'],
    ['balance', 'adjustment'],
  ])('normalizes %s to %s', (type, expectedType) => {
    expect(toInventoryMoveDatabaseRow({ ...baseMove, type }).type).toBe(expectedType);
  });

  it('preserves the ERP observation and relation mapping', () => {
    expect(toInventoryMoveDatabaseRow({
      ...baseMove,
      type: 'entry',
      label: 'Compra manual',
      unitCost: 12.5,
      unitPrice: 15,
      relatedEntityId: 'order-1',
      observation: 'Reposição conferida',
    })).toMatchObject({
      product_id: 'product-1',
      variation_id: 'variation-1',
      product_description: 'Cadeira azul',
      type: 'entry',
      quantity: 4,
      label: 'Compra manual',
      unit_cost: 12.5,
      unit_price: 15,
      order_id: 'order-1',
      observation: JSON.stringify({
        note: 'Reposição conferida', status: 'effective', reversalReason: null, reversedAt: null,
      }),
    });
  });

  it('writes signed balance adjustments and marks reversals in observation metadata', () => {
    expect(toInventoryMoveDatabaseRow({
      ...baseMove,
      type: 'balance',
      quantity: -2,
      observation: '{"note":"inventário","custom":true}',
      status: 'reversed',
      reversalReason: 'Lançamento incorreto',
      reversedAt: '2026-10-24T13:00:00.000Z',
    })).toMatchObject({
      type: 'adjustment',
      quantity: -2,
      observation: JSON.stringify({
        note: 'inventário', custom: true, status: 'reversed',
        reversalReason: 'Lançamento incorreto', reversedAt: '2026-10-24T13:00:00.000Z',
      }),
    });
  });
});
