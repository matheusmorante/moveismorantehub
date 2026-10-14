import { describe, expect, it } from 'vitest';
import { getReturnableQuantities, getReturnRequestValidationError } from '../returnQuantityRules';
import type { Item } from '../../types/items.type';
import contractCases from '../../../../../shared-utils/__fixtures__/commercialReturnDomain.cases.json';

const item = (overrides: Partial<Item> = {}): Item => ({
  description: 'Cadeira',
  quantity: 4,
  unitPrice: 100,
  unitDiscount: 0,
  discountType: 'fixed',
  handlingType: '',
  productId: 'p1',
  variationId: 'v1',
  ...overrides,
});

describe('getReturnableQuantities', () => {
  it('subtrai devoluções parciais anteriores da linha original', () => {
    expect(
      getReturnableQuantities(
        [item()],
        [
          { status: 'fulfilled', items: [{ ...item(), quantity: 1, originalOrderItemIndex: 0 }] },
          { status: 'scheduled', items: [{ ...item(), quantity: 2, originalOrderItemIndex: 0 }] },
        ]
      )
    ).toEqual([1]);
  });

  it('ignora devoluções canceladas e aloca linhas antigas sem origem por assinatura', () => {
    expect(
      getReturnableQuantities(
        [item(), item({ orderItemId: 'second' })],
        [
          { status: 'cancelled', items: [{ ...item(), quantity: 4, originalOrderItemIndex: 0 }] },
          { status: 'fulfilled', items: [{ ...item(), quantity: 3 }] },
        ]
      )
    ).toEqual([1, 4]);
  });

  it('não retorna saldo negativo em registros históricos inconsistentes', () => {
    expect(
      getReturnableQuantities(
        [item({ quantity: 2 })],
        [{ status: 'fulfilled', items: [{ ...item(), quantity: 5, originalOrderItemIndex: 0 }] }]
      )
    ).toEqual([0]);
  });
});

describe('commercial return domain boundary', () => {
  it.each(contractCases)('shares the database contract: $name', ({ sold, prior, requested, expected }) => {
    expect(getReturnRequestValidationError(sold, prior, requested)).toBe(expected);
  });
  const sold = [item({ quantity: 1 }), item({ quantity: 3 })];
  const requested = (overrides: Record<string, unknown> = {}) => ({ ...sold[0], originalOrderItemIndex: 0, ...overrides });
  it('accepts a complete return and independent partial returns', () => {
    expect(getReturnRequestValidationError(sold, [], [requested(), { ...sold[1], originalOrderItemIndex: 1 }])).toBeNull();
    expect(getReturnRequestValidationError(sold, [{ status: 'scheduled', items: [requested()] }], [{ ...sold[1], quantity: 2, originalOrderItemIndex: 1 }])).toBeNull();
  });
  it.each([
    ['RETURN_ITEMS_REQUIRED', []],
    ['RETURN_SOURCE_LINE_INVALID', [requested({ originalOrderItemIndex: -1 })]],
    ['RETURN_SOURCE_LINE_INVALID', [requested({ originalOrderItemIndex: 0.5 })]],
    ['RETURN_SOURCE_LINE_INVALID', [requested({ originalOrderItemIndex: 2 })]],
    ['RETURN_SOURCE_LINE_MISMATCH', [requested({ variationId: 'other' })]],
    ['RETURN_QUANTITY_INVALID', [requested({ quantity: 0 })]],
    ['RETURN_QUANTITY_INVALID', [requested({ quantity: -1 })]],
    ['RETURN_QUANTITY_INVALID', [requested({ quantity: Infinity })]],
    ['RETURN_QUANTITY_MISMATCH', [requested({ returnedQuantity: 0.5 })]],
    ['RETURN_CAPACITY_EXCEEDED', [requested({ quantity: 2 })]],
    ['RETURN_CAPACITY_EXCEEDED', [requested(), requested()]],
  ])('rejects %s', (code, rows) => {
    expect(getReturnRequestValidationError(sold, [], rows)).toBe(code);
  });
  it('does not pool spare capacity of identical SKUs across original lines', () => {
    expect(getReturnRequestValidationError(sold, [{ status: 'fulfilled', items: [requested()] }], [requested()])).toBe('RETURN_CAPACITY_EXCEEDED');
  });
});
