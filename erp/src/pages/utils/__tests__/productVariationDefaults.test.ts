import { describe, expect, it } from 'vitest';
import {
  computeVariationName,
  getSelectedProductDisplayName,
  hasVariationAttribute,
  getIncompleteVariationAttributes,
  hasMissingRequiredAttributes,
  ensureDefaultVariation,
} from '../productVariationDefaults';

describe('computeVariationName', () => {
  it('compõe o título com quantidades de portas e gavetas na ordem escolhida', () => {
    expect(
      computeVariationName('Guarda-roupa', [
        { name: 'Quantidade de portas', value: '6 portas' },
        { name: 'Quantidade de gavetas', value: '2 gavetas' },
      ])
    ).toBe('Guarda-Roupa 6 Portas 2 Gavetas');
  });

  it('omite somente atributos marcados como ocultos no nome', () => {
    expect(
      computeVariationName('Guarda-roupa', [
        { name: 'Cor', value: 'Branco' },
        { name: 'Quantidade de portas', value: '6 portas', showName: false },
        { name: 'Quantidade de gavetas', value: '2 gavetas', showName: true },
      ])
    ).toBe('Guarda-Roupa Branco 2 Gavetas');
  });

  it('mantém atributos legados visíveis quando showName não existe', () => {
    expect(computeVariationName('Cômoda', [{ name: 'Cor', value: 'Branco' }])).toBe(
      'Cômoda Branco'
    );
  });

  it('não inclui JSON serializado no nome quando todos os atributos estão ocultos', () => {
    expect(
      computeVariationName(
        'Armário',
        JSON.stringify([{ name: 'Quantidade de portas', value: '6 portas', showName: false }])
      )
    ).toBe('Armário');
  });
});

describe('ensureDefaultVariation no modo família de rascunho', () => {
  it('preserva a galeria própria quando a família em rascunho já tem uma variação provisória', () => {
    const parentImages = ['pai.jpg'];
    const variationImages = ['propria.jpg'];
    const product = ensureDefaultVariation({
      name: 'Mesa',
      status: 'draft',
      isDraft: true,
      hasVariations: true,
      images: parentImages,
      variations: [{ id: 'variation-1', images: variationImages } as any],
    });

    expect(product.hasVariations).toBe(true);
    expect(product.images).toEqual(parentImages);
    expect(product.variations?.[0].images).toEqual(variationImages);
  });

  it('cria a primeira linha de família sem herdar fotos do pai', () => {
    const product = ensureDefaultVariation({
      name: 'Mesa',
      code: 'MESA',
      status: 'draft',
      isDraft: true,
      has_variations: true,
      images: ['pai.jpg'],
      variations: [],
    } as any);

    expect(product.hasVariations).toBe(true);
    expect(product.images).toEqual(['pai.jpg']);
    expect(product.variations).toHaveLength(1);
    expect(product.variations?.[0].images).toEqual([]);
  });

  it('mantém a herança de fotos quando o rascunho está no modo simples', () => {
    const product = ensureDefaultVariation({
      name: 'Mesa',
      status: 'draft',
      isDraft: true,
      hasVariations: false,
      images: ['pai.jpg'],
      variations: [{ id: 'variation-1', images: [] } as any],
    });

    expect(product.hasVariations).toBe(false);
    expect(product.variations?.[0].images).toEqual(['pai.jpg']);
  });
});

describe('getSelectedProductDisplayName', () => {
  it('usa somente o nome da variação, mesmo quando ela já contém o nome do pai', () => {
    expect(
      getSelectedProductDisplayName({ name: 'Sofá Capri' }, { name: 'Sofá Capri Azul 3 lugares' })
    ).toBe('Sofá Capri Azul 3 Lugares');
  });

  it('completa atributos visíveis ausentes em nomes legados de variação', () => {
    expect(
      getSelectedProductDisplayName(
        { name: 'Sofá Capri' },
        { name: 'Sofá Capri', attributes: [{ name: 'Cor', value: 'Azul' }] }
      )
    ).toBe('Sofá Capri Azul');
  });

  it('usa o nome do produto quando não há variação', () => {
    expect(getSelectedProductDisplayName({ name: 'Sofá Capri' })).toBe('Sofá Capri');
  });

  it('usa o título ou a descrição como alternativa para cadastros antigos', () => {
    expect(getSelectedProductDisplayName({ title: 'Mesa Luna', description: 'Descrição' })).toBe(
      'Mesa Luna'
    );
  });
});

describe('hasVariationAttribute e getIncompleteVariationAttributes', () => {
  it('retorna false para variação sem atributos', () => {
    expect(hasVariationAttribute({ attributes: [] })).toBe(false);
    expect(hasVariationAttribute({ attributes: null })).toBe(false);
    expect(hasVariationAttribute(undefined)).toBe(false);
  });

  it('NÃO considera válido apenas por ter name/displayName se attributes estiver vazio', () => {
    expect(hasVariationAttribute({ name: 'Produto Variação 1', attributes: [] })).toBe(false);
  });

  it('retorna false e acusa atributo incompleto quando atributo está sem valor', () => {
    const variation = {
      attributes: [
        { name: 'Cor', value: '' },
        { name: 'Tamanho', value: 'G' },
      ],
    };
    expect(hasVariationAttribute(variation)).toBe(false);
    const incomp = getIncompleteVariationAttributes(variation);
    expect(incomp).toHaveLength(1);
    expect(incomp[0].name).toBe('Cor');
    expect(incomp[0].missingReason).toBe('missing_value');
  });

  it('retorna false e acusa quando atributo está sem nome', () => {
    const variation = {
      attributes: [{ name: '', value: 'Azul' }],
    };
    expect(hasVariationAttribute(variation)).toBe(false);
    const incomp = getIncompleteVariationAttributes(variation);
    expect(incomp).toHaveLength(1);
    expect(incomp[0].missingReason).toBe('missing_name');
  });

  it('retorna true somente quando TODOS os atributos possuem nome e valor preenchidos', () => {
    const variation = {
      attributes: [
        { name: 'Cor', value: 'Azul' },
        { name: 'Tamanho', value: 'M' },
      ],
    };
    expect(hasVariationAttribute(variation)).toBe(true);
    expect(getIncompleteVariationAttributes(variation)).toHaveLength(0);
  });

  it('funciona com atributos formatados como objeto', () => {
    expect(hasVariationAttribute({ attributes: { Cor: 'Azul', Tamanho: '' } })).toBe(false);
    expect(hasVariationAttribute({ attributes: { Cor: 'Azul', Tamanho: 'G' } })).toBe(true);
  });
});

describe('hasMissingRequiredAttributes', () => {
  it('retorna true se a lista de variações for vazia', () => {
    expect(hasMissingRequiredAttributes([])).toBe(true);
  });

  it('retorna true se qualquer variação estiver sem atributo ou com valor pendente', () => {
    const variations: any[] = [
      { id: '1', attributes: [{ name: 'Cor', value: 'Azul' }] },
      { id: '2', attributes: [{ name: 'Cor', value: '' }] },
    ];
    expect(hasMissingRequiredAttributes(variations)).toBe(true);
  });

  it('retorna false quando todas as variações tiverem todos os atributos e valores preenchidos', () => {
    const variations: any[] = [
      { id: '1', attributes: [{ name: 'Cor', value: 'Azul' }] },
      { id: '2', attributes: [{ name: 'Cor', value: 'Vermelho' }] },
    ];
    expect(hasMissingRequiredAttributes(variations)).toBe(false);
  });
});
