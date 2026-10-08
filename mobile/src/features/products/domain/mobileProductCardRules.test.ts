import { describe, expect, it } from 'vitest';
import {
  getMobileProductCardActionAvailability,
  isMobileProductStockLow,
} from './mobileProductCardRules';

describe('isMobileProductStockLow', () => {
  it('marks stock at or below the configured minimum as low', () => {
    expect(isMobileProductStockLow(2, 3)).toBe(true);
    expect(isMobileProductStockLow(3, 3)).toBe(true);
  });

  it('does not mark stock above the minimum as low', () => {
    expect(isMobileProductStockLow(4, 3)).toBe(false);
  });

  it('uses zero when stock or minimum stock is missing, like the ERP card', () => {
    expect(isMobileProductStockLow(undefined, undefined)).toBe(true);
    expect(isMobileProductStockLow(1, undefined)).toBe(false);
  });
});

describe('getMobileProductCardActionAvailability', () => {
  it('only offers duplicate for non-variations and linked orders for non-parents', () => {
    expect(getMobileProductCardActionAvailability({})).toEqual({
      canDuplicate: true,
      canShowLinkedOrders: true,
    });
    expect(getMobileProductCardActionAvailability({ isVariation: true })).toEqual({
      canDuplicate: false,
      canShowLinkedOrders: true,
    });
    expect(getMobileProductCardActionAvailability({ isParent: true })).toEqual({
      canDuplicate: true,
      canShowLinkedOrders: false,
    });
  });
});
