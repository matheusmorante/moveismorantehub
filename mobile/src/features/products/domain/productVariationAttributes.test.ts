import { describe, expect, it } from 'vitest';
import { hasMissingVariationAttributes, hasVariationAttribute } from './productVariationAttributes';

describe('productVariationAttributes', () => {
  it('requires at least one complete attribute on every variation', () => {
    expect(hasVariationAttribute({ attributes: [{ name: 'Cor', value: 'Azul' }] })).toBe(true);
    expect(hasVariationAttribute({ attributes: [{ name: 'Cor', value: '' }] })).toBe(false);
    expect(
      hasMissingVariationAttributes([
        { attributes: [{ name: 'Cor', value: 'Azul' }] },
        { attributes: [] },
      ])
    ).toBe(true);
  });

  it('accepts populated technical values and object-shaped attributes', () => {
    expect(hasVariationAttribute({ technicalValues: { Cor: 'Azul' } })).toBe(true);
    expect(hasVariationAttribute({ attributes: { Cor: 'Azul' } })).toBe(true);
    expect(hasMissingVariationAttributes([{ attributes: { Cor: 'Azul' } }])).toBe(false);
  });

  it('rejects an empty variation list', () => {
    expect(hasMissingVariationAttributes([])).toBe(true);
  });
});
