import { describe, expect, it, vi } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {},
  isTestEnvironment: false,
}));
import { validateCatalogPublication } from './useProductsCatalogActions';
import { buildPublishedCatalogEditConfirmationMessage, getPublishedCatalogEditIssues, checkEcomLegibility } from '../../../domain/productLegibilityRules';
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
  it('exige a característica condicional quando qualquer uma das alternativas é verdadeira', () => {
    const product: Partial<Product> = {
      id: 'prod-alternatives', name: 'Cômoda', description: 'Cômoda', status: 'hidden',
      unitPrice: 100, images: ['https://example.com/foto.jpg'], categoryIds: ['cat'],
      width: 50, height: 50, depth: 50,
      selectedCharacteristicIds: ['doors', 'drawers', 'handle'],
      activeCharacteristicIds: ['doors', 'drawers', 'handle'],
      technicalValues: { 'Quantidade de portas': 0, 'Quantidade de gavetas': 2, 'Tipo(s) de puxador': '' },
    };
    const requirements = [
      { id: 'doors', name: 'Quantidade de portas', dataType: 'integer', categoryIds: ['cat'] },
      { id: 'drawers', name: 'Quantidade de gavetas', dataType: 'integer', categoryIds: ['cat'] },
      { id: 'handle', name: 'Tipo(s) de puxador', dataType: 'radio', categoryIds: ['cat'],
        dependency: { referenceAttributeId: 'doors', operator: 'greater_than', value: '0' },
        dependencyAlternatives: [{ referenceAttributeId: 'drawers', operator: 'greater_than', value: '0' }] },
    ];
    const visible = validateCatalogPublication(product, undefined, false, requirements);
    expect(visible.errorMessage).toContain('Tipo(s) de puxador');
    const hidden = validateCatalogPublication({ ...product, technicalValues: {
      'Quantidade de portas': 0, 'Quantidade de gavetas': 0, 'Tipo(s) de puxador': '',
    } }, undefined, false, requirements);
    expect(hidden.errorMessage ?? '').not.toContain('Tipo(s) de puxador');
  });
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
    expect(result.errorMessage).toContain('• Ative pelo menos uma dimensão física (altura, largura, profundidade ou comprimento)');
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
      weight: 30,
      technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora' },
    };

    const result = validateCatalogPublication(validProduct as Product);
    expect(result.isValid).toBe(true);
    expect(result.errorMessage).toBeUndefined();
  });

  it('respeita aplicações opcionais de dimensões e peso de uma categoria', () => {
    const product: Partial<Product> = {
      id: 'kit-optional',
      name: 'Conjunto',
      description: 'Conjunto de móveis',
      status: 'hidden',
      unitPrice: 100,
      images: ['https://example.com/conjunto.jpg'],
      categoryIds: ['cat-kit'],
      technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora' },
      selectedCharacteristicIds: [],
      activeCharacteristicIds: [],
    };
    const requirements = [
      { id: 'depth', name: 'Profundidade total', groupId: 'dimensions', categoryApplications: [{ categoryId: 'cat-kit', application: 'optional' as const }] },
      { id: 'weight', name: 'Peso', groupId: 'weight', categoryApplications: [{ categoryId: 'cat-kit', application: 'optional' as const }] },
    ];
    expect(validateCatalogPublication(product, undefined, false, requirements).isValid).toBe(true);
    const requiredDepth = [{ ...requirements[0], categoryApplications: [{ categoryId: 'cat-kit', application: 'required' as const }] }, requirements[1]];
    expect(validateCatalogPublication(product, undefined, false, requiredDepth).errorMessage)
      .toContain('Profundidade total');
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
      weight: 30,
      technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora' },
    };
    const requirements = [
      { name: 'Acabamento', categoryApplications: [], requiredCategoryIds: ['cat-mesas'] },
    ];

    const result = validateCatalogPublication(product as Product, undefined, false, requirements);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Acabamento');

    const completedResult = validateCatalogPublication(
      { ...product, technicalValues: { ...product.technicalValues, Acabamento: 'Laca' } } as Product,
      undefined,
      false,
      requirements
    );
    expect(completedResult.isValid).toBe(true);
  });

  it('valida o requisito do Catálogo mesmo quando a aplicação no formulário da Categoria é indisponível', () => {
    const product: Partial<Product> = {
      id: 'prod-unavailable-catalog-required',
      name: 'Mesa de Jantar',
      description: 'Mesa de jantar de madeira',
      status: 'hidden',
      unitPrice: 1200,
      images: ['https://example.com/mesa.jpg'],
      categoryIds: ['cat-mesas'],
      width: 160,
      height: 80,
      depth: 90,
      technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora' },
    };
    const requirements = [{
      id: 'finish',
      name: 'Acabamento',
      active: false,
      groupId: 'group-finish',
      categoryApplications: [{ categoryId: 'cat-mesas', application: 'unavailable' as const }],
      unavailableCategoryIds: ['cat-mesas'],
      requiredCategoryIds: ['cat-mesas'],
    }];

    const missing = validateCatalogPublication(product as Product, undefined, false, requirements);
    expect(missing.isValid).toBe(false);
    expect(missing.errorMessage).toContain('Acabamento');

    const filled = validateCatalogPublication(
      { ...product, technicalValues: { ...product.technicalValues, Acabamento: 'Laca' } } as Product,
      undefined,
      false,
      requirements
    );
    expect(filled.isValid).toBe(true);
  });

  it('não trata uma característica obrigatória só no formulário como requisito do Catálogo', () => {
    const product: Partial<Product> = {
      id: 'prod-entry-required-only',
      name: 'Mesa de Jantar',
      description: 'Mesa de jantar de madeira',
      status: 'hidden',
      unitPrice: 1200,
      images: ['https://example.com/mesa.jpg'],
      categoryIds: ['cat-mesas'],
      width: 160,
      height: 80,
      depth: 90,
      technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora' },
    };
    const requirements = [{
      id: 'finish-entry-only',
      name: 'Acabamento',
      categoryApplications: [{ categoryId: 'cat-mesas', application: 'required' as const }],
      requiredProductCategoryIds: ['cat-mesas'],
    }];

    const result = validateCatalogPublication(product as Product, undefined, false, requirements);
    expect(result.isValid).toBe(true);
  });

  it('cobra características opcionais ativadas e ignora dependências ocultas', () => {
    const product: Partial<Product> = {
      id: 'prod-optional-group',
      name: 'Cômoda',
      description: 'Cômoda de madeira',
      status: 'hidden',
      unitPrice: 1200,
      images: ['https://example.com/comoda.jpg'],
      categoryIds: ['cat-comodas'],
      width: 80,
      height: 90,
      depth: 45,
      weight: 30,
      selectedCharacteristicIds: ['drawer-quantity', 'drawer-runner'],
      activeCharacteristicIds: ['drawer-quantity', 'drawer-runner'],
      technicalValues: {
        Marca: 'Morante',
        'Modelo/Linha': 'Matriz',
        'Quantidade de gavetas': 2,
        'Tipo de corrediça': '',
      },
    };
    const requirements = [
      {
        id: 'drawer-quantity', name: 'Quantidade de gavetas', groupId: 'drawers', dataType: 'integer',
        categoryIds: ['cat-comodas'],
      },
      {
        id: 'drawer-runner',
        name: 'Tipo de corrediça',
        groupId: 'drawers',
        dataType: 'radio',
        categoryIds: ['cat-comodas'],
        dependency: {
          referenceAttributeId: 'drawer-quantity',
          operator: 'greater_than',
          value: '1',
        },
      },
      {
        id: 'drawer-material', name: 'Material das gavetas', groupId: 'drawers', dataType: 'radio',
        categoryIds: ['cat-comodas'],
      },
    ];
    const characteristicGroups = [{ id: 'drawers' }];

    const inactiveGroup = validateCatalogPublication(
      {
        ...product,
        selectedCharacteristicIds: [],
        activeCharacteristicIds: [],
        technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora' },
      } as Product,
      undefined,
      false,
      requirements,
      { characteristicGroups }
    );
    expect(inactiveGroup.isValid).toBe(true);

    const missing = validateCatalogPublication(
      product as Product,
      undefined,
      false,
      requirements,
      { characteristicGroups }
    );
    expect(missing.isValid).toBe(false);
    expect(missing.errorMessage).toContain('Tipo de corrediça');
    expect(missing.errorMessage).not.toContain('Material das gavetas');

    const dependencyHidden = validateCatalogPublication(
      {
        ...product,
        technicalValues: {
          ...product.technicalValues,
          'Quantidade de gavetas': 1,
          'Tipo de corrediça': '',
        },
      } as Product,
      undefined,
      false,
      requirements,
      { characteristicGroups }
    );
    expect(dependencyHidden.isValid).toBe(true);

    const notInform = validateCatalogPublication(
      {
        ...product,
        technicalValues: {
          ...product.technicalValues,
          'Quantidade de gavetas': 2,
          'Tipo de corrediça': 'Não informar',
        },
      } as Product,
      undefined,
      false,
      requirements,
      { characteristicGroups }
    );
    expect(notInform.isValid).toBe(false);
    expect(notInform.errorMessage).toContain('Tipo de corrediça');

    const otherOptionalCharacteristicsRemainOff = validateCatalogPublication(
      {
        ...product,
        selectedCharacteristicIds: [],
        activeCharacteristicIds: [],
        technicalValues: {
          ...product.technicalValues,
          'Quantidade de gavetas': 2,
          'Tipo de corrediça': 'Correr',
          'Material das gavetas': '',
        },
      } as Product,
      undefined,
      false,
      requirements,
      { characteristicGroups }
    );
    expect(otherOptionalCharacteristicsRemainOff.isValid).toBe(true);

    const requiredCharacteristicDoesNotRequireItsWholeGroup = validateCatalogPublication(
      {
        ...product,
        selectedCharacteristicIds: [],
        activeCharacteristicIds: [],
        technicalValues: {
          ...product.technicalValues,
          'Quantidade de gavetas': 2,
          'Tipo de corrediça': 'Correr',
          'Material das gavetas': '',
        },
      } as Product,
      undefined,
      false,
      [
        { ...requirements[0], requiredProductCategoryIds: ['cat-comodas'] },
        requirements[1],
        requirements[2],
      ],
      { characteristicGroups }
    );
    expect(requiredCharacteristicDoesNotRequireItsWholeGroup.isValid).toBe(true);

    const entryRequiredCharacteristic = validateCatalogPublication(
      {
        ...product,
        selectedCharacteristicIds: [],
        activeCharacteristicIds: [],
        technicalValues: {
          ...product.technicalValues,
          'Quantidade de gavetas': '',
          'Tipo de corrediça': '',
          'Material das gavetas': '',
        },
      } as Product,
      undefined,
      false,
      [
        { ...requirements[0], requiredProductCategoryIds: ['cat-comodas'] },
        requirements[1],
        requirements[2],
      ],
      { characteristicGroups }
    );
    expect(entryRequiredCharacteristic.isValid).toBe(true);
    expect(entryRequiredCharacteristic.errorMessage).toBeUndefined();

    const zeroDoorDrawerQuantity = validateCatalogPublication(
      {
        ...product,
        selectedCharacteristicIds: [],
        activeCharacteristicIds: [],
        technicalValues: {
          ...product.technicalValues,
          'Quantidade de gavetas': 0,
          'Tipo de corrediça': '',
          'Material das gavetas': '',
        },
      } as Product,
      undefined,
      false,
      [
        { ...requirements[0], requiredProductCategoryIds: ['cat-comodas'] },
        requirements[1],
        requirements[2],
      ],
      { characteristicGroups }
    );
    expect(zeroDoorDrawerQuantity.isValid).toBe(true);
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
      weight: 30,
      variableTechnicalFields: ['Modelo/Linha'],
      technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Matriz' },
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

describe('Confirmação de alteração com perda de conformidade do Catálogo Digital', () => {
  it('explica o motivo, cita o campo e o que faltou quando uma característica da categoria está pendente', () => {
    const legibility = checkEcomLegibility(
      {
        name: 'Mesa de Jantar',
        description: 'Mesa de Jantar',
        unitPrice: 500,
        images: ['https://example.com/foto.jpg'],
        categoryIds: ['cat-1'],
        width: 100,
        height: 80,
        depth: 90,
        weight: 50,
        technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora', 'Material da estrutura': '' },
      },
      [{ name: 'Material da estrutura', requiredCategoryIds: ['cat-1'] }]
    );

    const issues = getPublishedCatalogEditIssues(legibility);
    expect(issues).toEqual([
      {
        field: '"Material da estrutura"',
        missing: 'característica obrigatória da categoria desativada ou sem valor preenchido',
      },
    ]);

    const message = buildPublishedCatalogEditConfirmationMessage(legibility);
    expect(message).toContain('Este produto está atualmente publicado no Catálogo Digital');
    expect(message).toContain('ao salvar, ele será ocultado do Catálogo Digital');
    expect(message).toContain('• Campo "Material da estrutura": característica obrigatória da categoria desativada ou sem valor preenchido.');
    expect(message).toContain('ajuste a conformidade do campo citado acima antes de salvar');
    expect(message).toContain('Deseja salvar as alterações e ocultar o produto do Catálogo Digital?');
  });

  it('cita múltiplos campos e usa plural na orientação quando faltam fotos e dimensões', () => {
    const legibility = checkEcomLegibility({
      name: 'Mesa de Jantar',
      description: 'Mesa de Jantar',
      unitPrice: 500,
      images: [],
      categoryIds: ['cat-1'],
      width: 0,
      height: 0,
      depth: 0,
      technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora' },
    });

    const issues = getPublishedCatalogEditIssues(legibility);
    expect(issues).toEqual(expect.arrayContaining([
      { field: 'Fotos', missing: 'adicione pelo menos uma foto ao produto' },
      { field: 'Dimensões', missing: 'ative e preencha pelo menos uma dimensão física (altura, largura, profundidade ou comprimento) com valor maior que zero' },
    ]));

    const message = buildPublishedCatalogEditConfirmationMessage(legibility);
    expect(message).toContain('• Campo Fotos: adicione pelo menos uma foto ao produto.');
    expect(message).toContain('• Campo Dimensões: ative e preencha pelo menos uma dimensão física');
    expect(message).toContain('ajuste a conformidade dos campos citados acima antes de salvar');
  });

  it('cita o campo Preço Promocional quando o valor promocional for maior ou igual ao de venda', () => {
    const legibility = checkEcomLegibility({
      name: 'Mesa de Jantar',
      description: 'Mesa de Jantar',
      unitPrice: 500,
      promoPrice: 550,
      images: ['https://example.com/foto.jpg'],
      categoryIds: ['cat-1'],
      width: 100,
      height: 80,
      depth: 90,
      weight: 50,
      technicalValues: { Marca: 'Morante', 'Modelo/Linha': 'Dora' },
    });

    const issues = getPublishedCatalogEditIssues(legibility);
    expect(issues).toEqual(expect.arrayContaining([
      { field: 'Preço Promocional', missing: 'o preço promocional deve ser menor que o preço de venda' },
    ]));

    const message = buildPublishedCatalogEditConfirmationMessage(legibility);
    expect(message).toContain('• Campo Preço Promocional: o preço promocional deve ser menor que o preço de venda.');
  });
});
