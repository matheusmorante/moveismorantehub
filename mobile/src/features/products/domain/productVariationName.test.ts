import { describe, expect, it } from 'vitest';
import { resolveProductVariationName } from './productVariationName';

describe('resolveProductVariationName', () => {
  it('preserva o nome explícito da variação', () => {
    expect(resolveProductVariationName({ name: 'Cadeira preta', productName: 'Cadeira' })).toBe('Cadeira preta');
  });

  it('gera nome persistível com produto e atributos', () => {
    expect(resolveProductVariationName({
      productName: 'Cadeira',
      attributes: { Cor: 'Preto', Tamanho: 'M' },
    })).toBe('Cadeira — Cor: Preto · Tamanho: M');
  });

  it('usa um valor seguro quando o produto não tem nome', () => {
    expect(resolveProductVariationName({ attributes: {} })).toBe('Variação');
  });
});
