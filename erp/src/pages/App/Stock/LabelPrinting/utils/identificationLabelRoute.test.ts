import { describe, expect, it } from 'vitest';
import { buildIdentificationOnlyLabelSearch } from './identificationLabelRoute';

describe('buildIdentificationOnlyLabelSearch', () => {
  it('forces identification mode and preserves the selected product context', () => {
    const search = buildIdentificationOnlyLabelSearch(
      '?cat=precos&productId=product-1&variationId=variation-1&autoAddProduct=true&fillSheet=1'
    );

    expect(new URLSearchParams(search)).toEqual(
      new URLSearchParams(
        'cat=identificacao&productId=product-1&variationId=variation-1&autoAddProduct=true&fillSheet=1'
      )
    );
  });

  it('replaces the legacy category alias without carrying its restricted value forward', () => {
    const search = buildIdentificationOnlyLabelSearch(
      '?category=precos&productId=product-1&autoAddProduct=true'
    );
    const params = new URLSearchParams(search);

    expect(params.get('cat')).toBe('identificacao');
    expect(params.has('category')).toBe(false);
    expect(params.get('productId')).toBe('product-1');
    expect(params.get('autoAddProduct')).toBe('true');
  });

  it('builds an identification-only query when no search params were supplied', () => {
    expect(buildIdentificationOnlyLabelSearch('')).toBe('?cat=identificacao');
  });
});
