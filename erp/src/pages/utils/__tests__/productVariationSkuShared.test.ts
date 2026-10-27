import { describe, expect, it } from 'vitest';
import { generateVariationSku } from '../../../../../shared-utils/productVariationSku';

describe('shared generateVariationSku', () => {
  it('reuses the lowest free suffix after gaps in the family sequence', () => {
    expect(generateVariationSku('654321', [{ sku: '654321-01' }, { sku: '654321-03' }])).toBe(
      '654321-02'
    );
  });

  it('returns successive free suffixes when generating a batch with offsets', () => {
    const existing = [{ sku: '654321-01' }, { sku: '654321-03' }];

    expect(generateVariationSku('654321', existing, 0)).toBe('654321-02');
    expect(generateVariationSku('654321', existing, 1)).toBe('654321-04');
    expect(generateVariationSku('654321', existing, 2)).toBe('654321-05');
  });

  it('keeps the direct index overload used by new simple and variation rows', () => {
    expect(generateVariationSku('654321', 0)).toBe('654321-01');
    expect(generateVariationSku('654321', 1)).toBe('654321-02');
  });

  it('does not reuse a numeric suffix present in a legacy commercial SKU', () => {
    expect(generateVariationSku('654321', [{ sku: 'LEGACY-01' }])).toBe('654321-02');
  });
});
