import { describe, expect, it } from 'vitest';
import { resolveProductVariationName } from './productVariationName';

describe('resolveProductVariationName', () => {
  it('preserva o nome explícito da variação', () => {
    expect(resolveProductVariationName({ name: 'Cadeira preta', productName: 'Cadeira' })).toBe(
      'Cadeira preta'
    );
  });

  it('monta o nome com os valores visíveis, sem incluir os rótulos das características', () => {
    expect(
      resolveProductVariationName({
        productName: 'Cadeira',
        attributes: { Cor: 'Preto', Tamanho: 'M' },
      })
    ).toBe('Cadeira Preto M');
  });

  it('não inclui no nome os valores marcados para ficarem ocultos', () => {
    expect(
      resolveProductVariationName({
        productName: 'Cadeira',
        attributes: [
          { name: 'Cor', value: 'Preto', showName: true },
          { name: 'Material da estrutura', value: 'Madeira', showName: false },
        ],
      })
    ).toBe('Cadeira Preto');
  });

  it('usa um valor seguro quando o produto não tem nome', () => {
    expect(resolveProductVariationName({ attributes: {} })).toBe('Variação');
  });
});
