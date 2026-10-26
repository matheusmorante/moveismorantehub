import { describe, expect, it } from 'vitest';
import { resolveProductAutocompleteDisplayPrice } from '../../../../shared-utils/productAutocompleteDisplayPrice';

describe('resolveProductAutocompleteDisplayPrice', () => {
  it('prefers a variation promotion price', () => {
    expect(resolveProductAutocompleteDisplayPrice({
      parentPromoPrice: 80,
      parentUnitPrice: 100,
      variationPromoPrice: 60,
      variationUnitPrice: 90,
    })).toBe(60);
  });

  it('prefers a variation unit price over the parent promotion price', () => {
    expect(resolveProductAutocompleteDisplayPrice({
      parentPromoPrice: 80,
      parentUnitPrice: 100,
      variationUnitPrice: 90,
    })).toBe(90);
  });

  it('uses the parent promotion price for a simple product candidate', () => {
    expect(resolveProductAutocompleteDisplayPrice({
      parentPromoPrice: 80,
      parentUnitPrice: 100,
    })).toBe(80);
  });

  it('retains ERP truthy fallback when a promotion price is zero', () => {
    expect(resolveProductAutocompleteDisplayPrice({
      parentPromoPrice: 80,
      parentUnitPrice: 100,
      variationPromoPrice: 0,
      variationUnitPrice: 90,
    })).toBe(90);
  });
});
