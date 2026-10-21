import { describe, expect, it } from 'vitest';
import { INITIAL_PRODUCT_FORM_DATA } from './productFormInitialData';
import { ensureDefaultVariation } from '@/pages/utils/productVariationDefaults';

describe('INITIAL_PRODUCT_FORM_DATA', () => {
  it('inicia um produto como simples e sem estoque lançado', () => {
    expect(INITIAL_PRODUCT_FORM_DATA).toMatchObject({
      itemType: 'product',
      active: false,
      status: 'draft',
      isDraft: true,
      hasVariations: false,
      variations: [],
      launchInitialStock: false,
    });
  });

  it('prepara uma única variação física para o produto simples ao abrir o formulário', () => {
    const product = ensureDefaultVariation({
      ...INITIAL_PRODUCT_FORM_DATA,
      name: 'Mesa de Jantar',
      code: '000123',
      stock: 4,
      unitPrice: 850,
    });

    expect(product.hasVariations).toBe(false);
    expect(product.variations).toHaveLength(1);
    expect(product.variations?.[0]).toMatchObject({
      name: 'Mesa de Jantar',
      stock: 4,
      unitPrice: 850,
      syncUnitPrice: true,
      syncDescription: true,
      syncFiscal: true,
      images: [],
    });
  });

  it('mantém os padrões fiscais mínimos de venda de produto', () => {
    expect(INITIAL_PRODUCT_FORM_DATA.fiscal).toEqual({
      ncm: '',
      cest: '',
      ncmDescription: '',
      cfop: '5102',
      cst: '103',
      icmsPercent: 0,
      merchandiseOrigin: 'third_party',
    });
  });
});
