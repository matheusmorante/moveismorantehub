import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {},
  isTestEnvironment: false,
}));
import { validateCatalogPublication } from './useProductsCatalogActions';
import {
  mapDbVariations,
  createDefaultVariation,
} from '@/pages/utils/productService/productVariationMapper';
import Product from '@/pages/types/product.type';
import {
  HML_FISCAL_TEST_ORDER_MARKER,
  TEST_PRODUCT_CATALOG_PUBLICATION_ERROR,
} from '@/pages/utils/hmlTestData';

describe('Validação de Publicação no Catálogo Digital', () => {
  it('bloqueia publicação de produto em rascunho', () => {
    const draftProduct: Partial<Product> = {
      id: 'prod-draft',
      description: 'Produto Rascunho',
      isDraft: true,
      status: 'draft',
      unitPrice: 100,
      images: ['https://example.com/foto.jpg'],
      categoryIds: ['cat-1'],
      width: 50,
      height: 50,
      depth: 50,
    };

    const result = validateCatalogPublication(draftProduct as Product);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('rascunho');
  });

  it('bloqueia publicação de produto sem conformidade de campos obrigatórios (sem fotos, sem dimensões)', () => {
    const incompleteProduct: Partial<Product> = {
      id: 'prod-incomplete',
      name: 'Produto Incompleto',
      description: 'Produto Incompleto',
      isDraft: false,
      status: 'hidden',
      unitPrice: 150,
      images: [], // Sem foto!
      categoryIds: ['cat-1'],
      width: 0, // Sem dimensões!
      height: 0,
      depth: 0,
    };

    const result = validateCatalogPublication(incompleteProduct as Product);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Não foi possível publicar no Catálogo Digital.');
    expect(result.errorMessage).toContain('Campos obrigatórios pendentes:');
    expect(result.errorMessage).toContain('• Pelo menos uma foto deve ser adicionada.');
    expect(result.errorMessage).toContain('• Ative pelo menos uma dimensão física (altura, largura ou profundidade/comprimento)');
  });

  it('aprova publicação quando produto atende a todos os requisitos do catálogo', () => {
    const validProduct: Partial<Product> = {
      id: 'prod-complete',
      name: 'Mesa de Jantar 6 Lugares',
      title: 'Mesa de Jantar 6 Lugares',
      description: 'Mesa de Jantar 6 Lugares em Madeira Maciça',
      isDraft: false,
      status: 'hidden',
      unitPrice: 1200,
      images: ['https://example.com/mesa.jpg'],
      categoryIds: ['cat-mesas'],
      width: 160,
      height: 80,
      depth: 90,
    };

    const result = validateCatalogPublication(validProduct as Product);
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBeUndefined();
  });

  it('aplica a obrigatoriedade de categoria somente à publicação no Catálogo Digital', () => {
    const product: Partial<Product> = {
      id: 'prod-category-required',
      name: 'Mesa de Jantar',
      description: 'Mesa de jantar de madeira',
      status: 'hidden',
      unitPrice: 1200,
      images: ['https://example.com/mesa.jpg'],
      categoryIds: ['cat-mesas'],
      width: 160,
      height: 80,
      depth: 90,
      technicalValues: {},
    };
    const requirements = [
      { name: 'Acabamento', requiredCategoryIds: ['cat-mesas'] },
    ];

    const result = validateCatalogPublication(product as Product, undefined, false, requirements);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Acabamento');

    const completedResult = validateCatalogPublication(
      { ...product, technicalValues: { Acabamento: 'Laca' } } as Product,
      undefined,
      false,
      requirements
    );
    expect(completedResult.isValid).toBe(true);
  });

  it('valida a característica variável da categoria em cada variação publicada', () => {
    const product: Partial<Product> = {
      id: 'prod-variation-required',
      name: 'Mesa de Jantar',
      description: 'Mesa de jantar de madeira',
      status: 'hidden',
      hasVariations: true,
      unitPrice: 1200,
      images: ['https://example.com/mesa.jpg'],
      categoryIds: ['cat-mesas'],
      width: 160,
      height: 80,
      depth: 90,
      variableTechnicalFields: ['Modelo/Linha'],
      technicalValues: { 'Modelo/Linha': 'Matriz' },
      variations: [
        { id: 'var-1', active: true, technicalValues: { 'Modelo/Linha': 'Linha A' } },
        { id: 'var-2', active: true, technicalValues: { 'Modelo/Linha': '' } },
      ] as any,
    };
    const requirements = [
      { name: 'Modelo', requiredCategoryIds: ['cat-mesas'] },
    ];

    const productResult = validateCatalogPublication(product as Product, undefined, false, requirements);
    expect(productResult.isValid).toBe(false);
    expect(productResult.errorMessage).toContain('Modelo');

    const variationResult = validateCatalogPublication(
      product as Product,
      product.variations?.[1],
      true,
      requirements
    );
    expect(variationResult.isValid).toBe(false);

    const completedProductResult = validateCatalogPublication(
      {
        ...product,
        variations: product.variations?.map((variation, index) =>
          index === 1 ? { ...variation, technicalValues: { 'Modelo/Linha': 'Linha B' } } : variation
        ),
      } as Product,
      undefined,
      false,
      requirements
    );
    expect(completedProductResult.isValid).toBe(true);
  });

  it('bloqueia publicação de produto fiscal de teste mesmo quando atende aos requisitos do catálogo', () => {
    const testProduct: Partial<Product> = {
      id: 'prod-test',
      code: 'NFEHML26P1',
      name: 'Produto de Teste Fiscal',
      description: 'Item sintético de homologação',
      observations: `Fixture ${HML_FISCAL_TEST_ORDER_MARKER}`,
      isDraft: false,
      status: 'hidden',
      unitPrice: 150,
      images: ['https://example.com/teste.jpg'],
      categoryIds: ['cat-1'],
      width: 50,
      height: 50,
      depth: 50,
    };

    const result = validateCatalogPublication(testProduct as Product);
    expect(result).toEqual({ isValid: false, errorMessage: TEST_PRODUCT_CATALOG_PUBLICATION_ERROR });
  });
});

describe('Mapeamento seguro de status de variações (Anti-publicação indevida)', () => {
  it('mapDbVariations define status hidden quando variação e pai não possuem status explícito', () => {
    const rawVariations = [
      {
        id: 'var-1',
        product_id: 'prod-1',
        sku: 'MESA-01',
        name: 'Mesa Tabaco',
        price: 500,
        stock: 2,
        status: null, // Sem status
      },
    ];

    const mapped = mapDbVariations(rawVariations, { id: 'prod-1', status: null }, 'MESA');
    expect(mapped[0].status).toBe('hidden');
  });

  it('createDefaultVariation define status hidden quando pai não possui status', () => {
    const mapped = createDefaultVariation(
      { id: 'prod-1', status: null },
      'MESA',
      'Mesa Simples',
      []
    );
    expect(mapped[0].status).toBe('hidden');
  });
});
