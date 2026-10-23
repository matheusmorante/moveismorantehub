import { describe, expect, it } from 'vitest';
import { calculateProductFinalPurchasePrice } from '../../../../../shared-utils/productPurchasePricing';
import { resolveProductSupplierPricingDefaults } from '../../../../../shared-utils/productSupplierPricingDefaults';

describe('calculateProductFinalPurchasePrice', () => {
  it('applies fixed and percentage freight after percentage IPI', () => {
    expect(calculateProductFinalPurchasePrice(250, 10, 30, 'fixed')).toBe(305);
    expect(calculateProductFinalPurchasePrice(250, 10, 5, 'percentage')).toBe(287.5);
  });

  it('omits freight when the selected type is none', () => {
    expect(calculateProductFinalPurchasePrice(250, 10, 30, 'none')).toBe(275);
  });

  it('supports fixed and absent IPI values', () => {
    expect(calculateProductFinalPurchasePrice(250, 10, 30, 'fixed', 'fixed')).toBe(290);
    expect(calculateProductFinalPurchasePrice(250, 10, 30, 'fixed', 'none')).toBe(280);
  });
});

describe('resolveProductSupplierPricingDefaults', () => {
  it('applies supplier defaults including zero values and no freight', () => {
    expect(
      resolveProductSupplierPricingDefaults(
        { ipiPercent: 10, freightCost: 25, freightType: 'fixed' },
        { defaultIpiPercent: 0, defaultFreightCost: 0, defaultFreightType: 'none' }
      )
    ).toEqual({ ipiPercent: 0, freightCost: 0, freightType: 'none' });
  });

  it('preserves current fields when the supplier has no corresponding default', () => {
    expect(
      resolveProductSupplierPricingDefaults(
        { ipiPercent: '5,5', freightCost: '12,00', freightType: 'percentage' },
        { defaultIpiPercent: null, defaultFreightCost: null, defaultFreightType: null }
      )
    ).toEqual({ ipiPercent: '5,5', freightCost: '12,00', freightType: 'percentage' });
  });
});
