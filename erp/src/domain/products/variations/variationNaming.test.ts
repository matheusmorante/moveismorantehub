import { describe, expect, it } from 'vitest';
import { normalizeProductVariationName } from './variationNaming';

describe('normalizeProductVariationName', () => {
  it.each(['-', '–', '—'])('normalizes a repeated product prefix with %s', (separator) => {
    expect(normalizeProductVariationName('Produto', `Produto ${separator} Azul`)).toBe(
      'Produto Azul'
    );
  });

  it('preserves other names and a prefix without a separator', () => {
    expect(normalizeProductVariationName('Produto', 'Produto Azul')).toBe('Produto Azul');
    expect(normalizeProductVariationName('Produto', 'Linha Azul')).toBe('Linha Azul');
  });
});
