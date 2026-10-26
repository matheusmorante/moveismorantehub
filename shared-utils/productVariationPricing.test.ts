import { describe, expect, it } from 'vitest';
import { resolveProductVariationPricing } from './productVariationPricing';

describe('resolveProductVariationPricing', () => {
  it('preserva promoção própria quando o preço regular é herdado', () => {
    expect(
      resolveProductVariationPricing(
        { syncUnitPrice: true, syncPromoPrice: false, unitPrice: 100, promoPrice: 65 },
        { unitPrice: 150, promoPrice: 120 }
      )
    ).toEqual({
      unitPrice: 150,
      promoPrice: 65,
      inheritsUnitPrice: true,
      inheritsPromoPrice: false,
      hasMixedInheritance: true,
    });
  });

  it('preserva preço regular próprio quando a promoção é herdada', () => {
    expect(
      resolveProductVariationPricing(
        { syncUnitPrice: false, syncPromoPrice: true, unitPrice: 100, promoPrice: 65 },
        { unitPrice: 150, promoPrice: 120 }
      )
    ).toMatchObject({
      unitPrice: 100,
      promoPrice: 120,
      inheritsUnitPrice: false,
      inheritsPromoPrice: true,
      hasMixedInheritance: true,
    });
  });

});
