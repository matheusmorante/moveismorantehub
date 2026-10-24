import { describe, expect, it } from 'vitest';
import { applyInventoryMoveToStockProjection } from './inventoryStockProjection';

describe('applyInventoryMoveToStockProjection', () => {
  it('updates one variation and recomputes the parent balance and weighted cost', () => {
    const product = {
      stock: 5,
      costPrice: 10,
      variations: [
        { id: 'variation-1', stock: 2, costPrice: 10 },
        { id: 'variation-2', stock: 3, costPrice: 10 },
      ],
    };
    const result = applyInventoryMoveToStockProjection(product, {
      variationId: 'variation-1', type: 'entry', quantity: 2, unitCost: 16,
    });

    expect(result).toEqual({
      stock: 7,
      costPrice: 11.714285714285714,
      variations: [
        { id: 'variation-1', stock: 4, costPrice: 13 },
        { id: 'variation-2', stock: 3, costPrice: 10 },
      ],
    });
    expect(product.variations[0].stock).toBe(2);
  });

  it.each([
    ['entry', 2, 7], ['withdrawal', 2, 3], ['balance', -2, 3],
  ])('applies %s movement to a single-variation product', (type, quantity, expectedStock) => {
    const result = applyInventoryMoveToStockProjection({
      stock: 5,
      costPrice: 8,
      variations: [{ id: 'variation-1', stock: 5, costPrice: 8 }],
    }, { variationId: 'variation-1', type, quantity });

    expect(result.stock).toBe(expectedStock);
    expect(result.variations[0].stock).toBe(expectedStock);
    expect(result.costPrice).toBe(8);
  });

  it('uses entry cost for a zero-stock variation and does not invent cost for an uncosted entry', () => {
    expect(applyInventoryMoveToStockProjection({
      stock: 0, variations: [{ id: 'variation-1', stock: 0, costPrice: 0 }],
    }, { variationId: 'variation-1', type: 'entry', quantity: 3, unitCost: 4 }).variations[0].costPrice)
      .toBe(4);
    expect(applyInventoryMoveToStockProjection({
      stock: 0, variations: [{ id: 'variation-1', stock: 0, costPrice: 0 }],
    }, { variationId: 'variation-1', type: 'entry', quantity: 3 }).costPrice)
      .toBe(0);
  });

  it('rejects a variation not owned by the product snapshot', () => {
    expect(() => applyInventoryMoveToStockProjection({
      stock: 0, variations: [{ id: 'variation-1', stock: 0 }],
    }, { variationId: 'foreign-variation', type: 'entry', quantity: 1 })).toThrow(
      'Variação não encontrada para confirmar o saldo.'
    );
  });
});
