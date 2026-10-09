import { describe, expect, it } from 'vitest';
import {
  getMobileProductCardActionAvailability,
  isMobileProductStockLow,
  isSalvadoProduct,
  resolveCanonicalOpportunityBadge,
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

describe('isSalvadoProduct', () => {
  it('identifies salvado by productKind, condition, product_kind or flag', () => {
    expect(isSalvadoProduct({ productKind: 'salvado' })).toBe(true);
    expect(isSalvadoProduct({ product_kind: 'salvado' })).toBe(true);
    expect(isSalvadoProduct({ condition: 'salvado' })).toBe(true);
    expect(isSalvadoProduct({ is_salvado: true })).toBe(true);
    expect(isSalvadoProduct({ isSalvado: true })).toBe(true);
    expect(isSalvadoProduct({ productKind: 'normal' })).toBe(false);
    expect(isSalvadoProduct(null)).toBe(false);
  });
});

describe('resolveCanonicalOpportunityBadge', () => {
  it('canonicalizes salvado products to "Queima dos Salvados"', () => {
    expect(resolveCanonicalOpportunityBadge({ productKind: 'salvado' })).toEqual({
      label: 'Queima dos Salvados',
      isSalvado: true,
    });
    expect(resolveCanonicalOpportunityBadge({ condition: 'salvado' }, 'Salvados')).toEqual({
      label: 'Queima dos Salvados',
      isSalvado: true,
    });
    expect(resolveCanonicalOpportunityBadge({}, 'Queima dos Salvados 2026')).toEqual({
      label: 'Queima dos Salvados',
      isSalvado: true,
    });
  });

  it('preserves non-salvado opportunity names and returns null when empty', () => {
    expect(resolveCanonicalOpportunityBadge({}, 'Semana do Cliente')).toEqual({
      label: 'Semana do Cliente',
      isSalvado: false,
    });
    expect(resolveCanonicalOpportunityBadge({}, null)).toBeNull();
    expect(resolveCanonicalOpportunityBadge({}, '')).toBeNull();
  });
});
