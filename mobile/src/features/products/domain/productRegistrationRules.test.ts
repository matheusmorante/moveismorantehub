import { describe, expect, it } from 'vitest';
import {
  getMobilePublishedCatalogEditLegibility,
  getMobileProductReadiness,
  getMobileEffectiveVariationPrice,
  getMobileVariationRegistrationIssue,
  isMobileEcommerceLegible,
  isMobileProductErpLegible,
  isMobileSalvadoProduct,
} from './productRegistrationRules';
import {
  getEffectiveProductForVariationReadiness,
  hasProductVariationPhotos,
} from '../../../../../shared-utils/productErpLegibility';

const parent = {
  name: 'Armário',
  description: 'Armário de madeira',
  unitPrice: '1.250,00',
  categoryIds: ['categoria'],
  mainSupplierId: 'fornecedor',
  width: 80,
  height: 180,
  depth: 50,
  technicalValues: {
    Cor: 'Azul',
    Modelo: 'Padrão',
    Marca: 'Morante',
    'Material da estrutura': 'Madeira',
  },
};

const variation = {
  id: 'variation-1',
  name: 'Armário Azul',
  sku: 'ARM-01',
  syncUnitPrice: true,
  syncPromoPrice: true,
  syncWidth: true,
  syncHeight: true,
  syncDepth: true,
  attributes: [{ name: 'Cor', value: 'Azul', showName: false }],
};

describe('productRegistrationRules', () => {
  it('espelha a prontidão ERP para origem do estoque, preço e variações', () => {
    expect(isMobileProductErpLegible(parent)).toBe(true);
    expect(isMobileProductErpLegible({ ...parent, productKind: 'salvado' })).toBe(false);
    expect(isMobileProductErpLegible({ ...parent, productKind: 'usado' })).toBe(false);
    expect(
      isMobileProductErpLegible({ ...parent, hasVariations: true, variations: [variation] })
    ).toBe(true);
    expect(isMobileProductErpLegible({ ...parent, hasVariations: true, variations: [] })).toBe(
      false
    );
  });

  it('expõe no cabeçalho os resultados detalhados dos validadores compartilhados', () => {
    const readiness = getMobileProductReadiness({
      ...parent,
      title: 'Armário',
      ecommerceDescription: 'Armário de madeira.',
      images: ['https://example.test/armario.jpg'],
      width: 80,
      height: 180,
      depth: 50,
      variations: [{ ...variation, images: ['https://example.test/armario-azul.jpg'] }],
      hasVariations: true,
    });

    expect(readiness.erp).toMatchObject({
      isLegible: true,
      checks: {
        description: true,
        unitPrice: true,
        categories: true,
        supplier: true,
        origin: true,
      },
    });
    expect(readiness.catalog).toMatchObject({
      isLegible: true,
      checks: {
        marketplaceTitle: true,
        unitPrice: true,
        categories: true,
        images: true,
        dimensions: true,
      },
    });
    expect(readiness.variationPhotos).toBe(true);
  });

  it('interpreta preços e dimensões localizados do formulário antes do checklist do catálogo', () => {
    const readiness = getMobileProductReadiness({
      ...parent,
      title: 'Armário',
      ecommerceDescription: 'Armário de madeira.',
      images: ['https://example.test/armario.jpg'],
      unitPrice: '1.250,00',
      width: '80,5',
      height: '180,0',
      depth: '50,0',
      variations: [],
      hasVariations: false,
    });

    expect(readiness.catalog.checks.unitPrice).toBe(true);
    expect(readiness.catalog.checks.dimensions).toBe(true);
  });

  it('impede manter publicado sem atributos obrigatórios da categoria e permite a edição válida', () => {
    const publishedProduct = { ...parent, status: 'published' };
    const candidate = {
      ...parent,
      title: 'Armário',
      ecommerceDescription: 'Armário de madeira.',
      unitPrice: 1250,
      images: ['https://example.test/armario.jpg'],
      hasVariations: true,
      variableTechnicalFields: ['Material da estrutura'],
      variations: [{ ...variation, attributes: [] }],
    };
    const categoryRequirements = [
      { name: 'Material da estrutura', requiredCategoryIds: ['categoria'] },
    ];

    expect(
      getMobilePublishedCatalogEditLegibility(
        publishedProduct,
        candidate,
        categoryRequirements
      )
    ).toMatchObject({
      isLegible: false,
      missingCategoryCharacteristics: ['Material da estrutura'],
    });
    expect(
      getMobilePublishedCatalogEditLegibility(
        publishedProduct,
        {
          ...candidate,
          variations: [
            {
              ...candidate.variations[0],
              attributes: [{ name: 'Material da estrutura', value: 'MDF' }],
            },
          ],
        },
        categoryRequirements
      )?.isLegible
    ).toBe(true);
    expect(getMobilePublishedCatalogEditLegibility({ status: 'hidden' }, candidate, [])).toBeNull();
  });

  it('normaliza preços e dimensões pt-BR do formulário antes da checagem compartilhada', () => {
    const candidate = {
      name: 'Armário',
      title: 'Armário',
      status: 'published',
      ecommerceDescription: 'Armário de madeira.',
      unitPrice: '1.250,00',
      categoryIds: ['categoria'],
      images: ['https://example.test/armario.jpg'],
      width: '80,5',
      height: '180,0',
      depth: '50,0',
      technicalValues: { 'Material da estrutura': 'Madeira' },
      hasVariations: false,
      variations: [],
    };
    const validation = getMobilePublishedCatalogEditLegibility(
      candidate,
      candidate,
      [{ name: 'Material da estrutura', requiredCategoryIds: ['categoria'] }]
    );

    expect(validation).toMatchObject({
      isLegible: true,
      checks: { unitPrice: true, dimensions: true, categoryCharacteristics: true },
    });
  });

  it('usa a mesma projeção pai/variação do ERP para os requisitos do modal', () => {
    const parentProduct = {
      ...parent,
      name: 'Armário pai',
      productKind: 'normal',
      hasVariations: false,
      images: ['https://example.test/parent.jpg'],
    };
    const ownVariation = getEffectiveProductForVariationReadiness(parentProduct, {
      name: 'Armário azul',
      syncUnitPrice: false,
      unitPrice: '62,50',
      images: ['https://example.test/blue.jpg'],
    });
    const inheritedVariation = getEffectiveProductForVariationReadiness(parentProduct, {
      name: 'Armário verde',
      syncUnitPrice: true,
      unitPrice: '9,99',
      images: [],
    });
    const emptyOwnPrice = getEffectiveProductForVariationReadiness(parentProduct, {
      name: 'Armário preto',
      syncUnitPrice: false,
      unitPrice: '',
      images: [],
    });

    expect(ownVariation).toMatchObject({
      mainSupplierId: 'fornecedor',
      description: 'Armário azul',
      unitPrice: '62,50',
      images: ['https://example.test/blue.jpg'],
    });
    expect(inheritedVariation).toMatchObject({
      unitPrice: parentProduct.unitPrice,
      images: parentProduct.images,
    });
    expect(emptyOwnPrice.unitPrice).toBe(parentProduct.unitPrice);
    expect(getMobileProductReadiness(inheritedVariation).catalog.checks.images).toBe(true);
    expect(getMobileProductReadiness(ownVariation)).toMatchObject({
      erp: { checks: { unitPrice: true, categories: true, supplier: true } },
      catalog: { checks: { unitPrice: true, images: true } },
    });
  });

  it('compartilha a regra do checklist para fotos das variações sem mudar ativação ERP', () => {
    const noPhotos = { ...parent, variations: [{ ...variation, images: [] }], hasVariations: true };
    const withLegacyPhoto = {
      ...parent,
      variations: [{ ...variation, images: undefined, image_url: ' photo-1,photo-2 ' }],
      hasVariations: true,
    };

    expect(hasProductVariationPhotos(noPhotos)).toBe(false);
    expect(hasProductVariationPhotos(withLegacyPhoto)).toBe(true);
    expect(isMobileProductErpLegible(noPhotos)).toBe(true);
  });

  it.each([
    [{ productKind: 'salvado' }, true],
    [{ product_kind: 'salvados' }, true],
    [{ condition: 'salvado' }, true],
    [{ is_salvado: true }, true],
    [{ stock_origin: 'salvados' }, true],
    [{ productKind: 'normal', condition: 'salvado' }, false],
    [{ productKind: 'normal' }, false],
  ])('espelha a classificação ERP de salvado para visibilidade do badge', (product, expected) => {
    expect(isMobileSalvadoProduct(product)).toBe(expected);
  });

  it('aceita uma variação completa e resolve preço e dimensões herdados', () => {
    expect(getMobileEffectiveVariationPrice(parent, variation)).toBe(1250);
    expect(getMobileVariationRegistrationIssue(parent, variation, [variation])).toBeNull();
  });

  it('aceita o categoryId legado quando categoryIds está vazio', () => {
    expect(
      getMobileVariationRegistrationIssue(
        { ...parent, categoryIds: [], categoryId: 'categoria-legada' },
        variation,
        [variation]
      )
    ).toBeNull();
  });

  it('mantém Material da estrutura opcional, como no ERP', () => {
    expect(
      getMobileVariationRegistrationIssue(
        { ...parent, technicalValues: { ...parent.technicalValues, 'Material da estrutura': '' } },
        variation,
        [variation]
      )
    ).toBeNull();
  });

  it('bloqueia uma variação sem preço próprio mesmo quando outra está válida', () => {
    const second = {
      ...variation,
      id: 'variation-2',
      sku: 'ARM-02',
      attributes: [{ name: 'Cor', value: 'Verde' }],
      syncUnitPrice: false,
      price: 0,
    };

    expect(getMobileVariationRegistrationIssue(parent, second, [variation, second])).toMatchObject({
      message: 'Preço de Venda deve ser maior que zero.',
      tab: 'estoque',
    });
  });

  it('detecta combinações de características duplicadas sem considerar showName', () => {
    const duplicate = {
      ...variation,
      id: 'variation-2',
      sku: 'ARM-02',
      attributes: [{ name: ' cor ', value: ' azul ' }],
    };

    expect(
      getMobileVariationRegistrationIssue(parent, duplicate, [variation, duplicate])
    ).toMatchObject({
      message: 'Já existe outra variação com a mesma combinação de características e valores.',
    });
  });

  it('detecta SKU repetido sem diferenciar maiúsculas e espaços externos', () => {
    const duplicate = {
      ...variation,
      id: 'variation-2',
      sku: ' arm-01 ',
      attributes: [{ name: 'Cor', value: 'Verde' }],
    };

    expect(
      getMobileVariationRegistrationIssue(parent, duplicate, [variation, duplicate])
    ).toMatchObject({
      message: 'O SKU " arm-01 " já está em uso em outra variação.',
    });
  });

  it('resolve dimensões técnicas e bloqueia uma dimensão ausente', () => {
    const withTechnicalDimensions = {
      ...parent,
      width: 0,
      height: 0,
      depth: 0,
      technicalValues: {
        Cor: 'Azul',
        Modelo: 'Padrão',
        Marca: 'Morante',
        'Material da estrutura': 'Madeira',
        Largura: '80',
        Altura: '180',
        Profundidade: '50',
      },
    };
    expect(
      getMobileVariationRegistrationIssue(withTechnicalDimensions, variation, [variation])
    ).toBeNull();
    expect(
      getMobileVariationRegistrationIssue(
        {
          ...withTechnicalDimensions,
          height: '',
          technicalValues: {
            ...withTechnicalDimensions.technicalValues,
            Altura: '',
          },
        },
        variation,
        [variation]
      )
    ).toBeNull();
  });

  it('bloqueia preço promocional igual ou acima do preço efetivo', () => {
    const promoParent = { ...parent, promoPrice: '1.250,00' };
    expect(getMobileVariationRegistrationIssue(promoParent, variation, [variation])).toMatchObject({
      tab: 'estoque',
      message: 'O preço promocional deve ser menor que o preço de venda.',
    });
  });

  it('mantém publicados apenas produtos que continuam legíveis para o catálogo', () => {
    const catalogProduct = {
      ...parent,
      width: 0,
      depth: 0,
      technicalValues: {
        ...parent.technicalValues,
        Altura: '180',
        Largura: 'Não se aplica',
        Profundidade: 'Não se aplica',
      },
      title: 'Armário',
      ecommerceDescription: 'Armário com estrutura de madeira.',
      images: ['https://example.test/armario.jpg'],
      variations: [variation],
      hasVariations: true,
    };
    expect(isMobileEcommerceLegible(catalogProduct)).toBe(true);
    expect(isMobileEcommerceLegible({ ...catalogProduct, images: [] })).toBe(false);
    expect(
      isMobileEcommerceLegible({
        ...catalogProduct,
        technicalValues: {
          ...catalogProduct.technicalValues,
          Largura: '',
          Altura: '180',
          Profundidade: 'Não se aplica',
        },
      })
    ).toBe(false);
    expect(
      isMobileEcommerceLegible({
        ...catalogProduct,
        width: 80,
        height: 180,
        depth: 50,
        technicalValues: {
          ...catalogProduct.technicalValues,
          Largura: 'Não se aplica',
          Altura: 'Não se aplica',
          Profundidade: 'Não se aplica',
        },
      })
    ).toBe(false);
  });

  it('não bloqueia cadastro de variação por fornecedor ausente no rascunho do pai', () => {
    const parentWithoutSupplier = { ...parent, mainSupplierId: '', supplierId: '' };
    expect(
      getMobileVariationRegistrationIssue(parentWithoutSupplier, variation, [variation])
    ).toBeNull();
  });

  it('não exige dimensão técnica marcada explicitamente como Não se aplica', () => {
    const withNonApplicableDimension = {
      ...parent,
      width: 0,
      height: 0,
      depth: 0,
      technicalValues: {
        Cor: 'Azul',
        Modelo: 'Padrão',
        Marca: 'Morante',
        'Material da estrutura': 'Madeira',
        Largura: '80',
        Altura: '180',
        Profundidade: 'Não se aplica',
      },
    };
    expect(
      getMobileVariationRegistrationIssue(withNonApplicableDimension, variation, [variation])
    ).toBeNull();
  });
});
