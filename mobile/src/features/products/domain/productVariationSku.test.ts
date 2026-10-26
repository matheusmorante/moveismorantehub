import { describe, expect, it } from 'vitest';
import {
  normalizeProductVariationSku,
  resolveProductVariationSku,
} from '../../../../../shared-utils/productVariationSku';

describe('shared product variation SKU presentation', () => {
  it('preserves a custom commercial SKU regardless of its parent code', () => {
    expect(resolveProductVariationSku('CATALOG-RED', 'PARENT-1', 0)).toBe('CATALOG-RED');
  });

  it('removes only the legacy internal suffix and preserves commercial casing', () => {
    expect(normalizeProductVariationSku('  AbC-01-a1b2c3  ')).toBe('AbC-01');
    expect(normalizeProductVariationSku('custom-red')).toBe('custom-red');
  });

  it('generates a padded SKU only when the stored SKU is missing', () => {
    expect(resolveProductVariationSku(null, 'PARENT-1', 0)).toBe('PARENT-1-01');
    expect(resolveProductVariationSku('', 'PARENT-1', 2)).toBe('PARENT-1-03');
  });
});
