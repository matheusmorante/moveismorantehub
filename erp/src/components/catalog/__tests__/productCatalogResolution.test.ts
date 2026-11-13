import { describe, expect, it } from 'vitest';
import { resolveCatalogEffectiveItems } from '../productCatalogResolution';
import type { SupportCatalogProduct, SupportCatalogProductDetails } from '../supportCatalogService';
import type { CatalogItem } from '../productCatalogPresentation';

const mockProduct = (id: string, name: string, hasVariations = false): SupportCatalogProduct => ({
  id,
  name,
  title: null,
  sku: `SKU-${id}`,
  slug: `slug-${id}`,
  brand: 'Morante',
  category: 'Armários Multiuso',
  price: 500,
  promoPrice: 450,
  imageUrl: `https://example.com/${id}.jpg`,
  hasVariations,
  variations: hasVariations ? [] : [{
    id: `var-${id}`,
    name,
    sku: `SKU-${id}`,
    price: 500,
    promoPrice: 450,
    imageUrl: `https://example.com/${id}.jpg`,
    attributes: {},
  }],
});

describe('resolveCatalogEffectiveItems', () => {
  it('retorna os itens manuais quando não há bulkScope', () => {
    const manualItem: CatalogItem = {
      productId: 'p1',
      name: 'Produto 1',
      price: 100,
      imageUrl: '',
    };
    const selected = new Map<string, CatalogItem>([['p1', manualItem]]);
    const result = resolveCatalogEffectiveItems(selected, null, [], new Map());
    expect(result).toEqual([manualItem]);
  });

  it('resolve produtos da categoria em lote para CatalogItem quando bulkScope está ativo', () => {
    const products = [
      mockProduct('p1', 'Armário 1'),
      mockProduct('p2', 'Armário 2'),
      mockProduct('p3', 'Armário 3'),
    ];
    const bulkScope = {
      selectionMode: 'all_matching' as const,
      filters: { categoryId: 'cat-1', search: '', brand: '' },
      categoryName: 'Armários Multiuso',
      total: 3,
      excludedProductIds: ['p2'],
    };

    const result = resolveCatalogEffectiveItems(new Map(), bulkScope, products, new Map());
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.productId)).toEqual(['p1', 'p3']);
  });

  it('resolve variações ativas quando produto possui variações no mapa de detalhes', () => {
    const product = mockProduct('p-var', 'Armário com Variação', true);
    const details: SupportCatalogProductDetails = {
      productId: 'p-var',
      variations: [{
        id: 'var-1',
        name: 'Armário Branco',
        sku: 'ARM-BR',
        price: 600,
        promoPrice: 550,
        imageUrl: 'https://example.com/branco.jpg',
        attributes: {},
      }],
    };
    const detailsById = new Map([['p-var', details]]);
    const bulkScope = {
      selectionMode: 'all_matching' as const,
      filters: { categoryId: 'cat-1', search: '', brand: '' },
      categoryName: 'Armários Multiuso',
      total: 1,
      excludedProductIds: [],
    };

    const result = resolveCatalogEffectiveItems(new Map(), bulkScope, [product], detailsById);
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe('p-var');
    expect(result[0].variationId).toBe('var-1');
    expect(result[0].variationName).toBe('Armário Branco');
  });
});
