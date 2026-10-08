import { describe, expect, it } from 'vitest';
import {
  applyProductCharacteristicToVariationNames,
  canUseProductCharacteristicInVariationName,
  containsProductVariationNamePhrase,
  isProductCharacteristicIncludedInVariationNames,
  resolveProductVariationName,
} from './productVariationName';

describe('containsProductVariationNamePhrase', () => {
  it('matches complete phrases regardless of accents or case', () => {
    expect(containsProductVariationNamePhrase('Cadeira Azul Marinho', 'azul marinho')).toBe(true);
  });

  it('does not match a phrase that appears only as part of another word', () => {
    expect(containsProductVariationNamePhrase('Cadeira Azulada', 'Azul')).toBe(false);
  });
});

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

describe('característica usada no nome das variações', () => {
  it('habilita a ação quando alguma variação tem valor próprio ou herda o valor do pai', () => {
    expect(
      canUseProductCharacteristicInVariationName(
        [
          { name: 'Sofá Azul' },
          { name: 'Sofá Verde', attributes: [{ name: 'Cor', value: 'Verde' }] },
        ],
        'Cor',
        'Azul'
      )
    ).toBe(true);
  });

  it('inclui a característica e preserva títulos independentes', () => {
    const updated = applyProductCharacteristicToVariationNames(
      [
        {
          name: 'Sofá 2 Lugares',
          title: 'Sofá 2 Lugares',
          marketplaceTitle: 'Título editado manualmente',
          attributes: [
            { name: 'Cor', value: 'Azul', showName: false },
            { name: 'Lugares', value: '2', showName: true },
          ],
        },
        {
          name: 'Sofá 3 Lugares',
          title: 'Sofá 3 Lugares',
          technicalValues: { cor: 'Verde' },
          attributes: [],
        },
      ],
      'Sofá',
      'Cor',
      'Vermelho'
    );

    expect(updated[0]).toMatchObject({
      name: 'Sofá 2 Lugares Azul',
      title: 'Sofá 2 Lugares Azul',
      marketplaceTitle: 'Título editado manualmente',
      attributes: [
        { name: 'Cor', value: 'Azul', showName: true },
        { name: 'Lugares', value: '2', showName: true },
      ],
    });
    expect(updated[1]).toMatchObject({
      name: 'Sofá 3 Lugares Verde',
      title: 'Sofá 3 Lugares Verde',
      attributes: [{ name: 'Cor', value: 'Verde', showName: true }],
    });
  });

  it('não duplica a característica no nome e reconhece quando todas já a exibem', () => {
    const variations = [
      { name: 'Cadeira Azulada', attributes: [{ name: 'Cor', value: 'Azul' }] },
      { name: 'Cadeira Verde', attributes: [{ name: 'Cor', value: 'Verde' }] },
    ];

    expect(
      isProductCharacteristicIncludedInVariationNames(variations, 'Cadeira', 'Cor', 'Azul')
    ).toBe(true);
    expect(applyProductCharacteristicToVariationNames(variations, 'Cadeira', 'Cor', 'Azul')).toBe(
      variations
    );
  });
});
