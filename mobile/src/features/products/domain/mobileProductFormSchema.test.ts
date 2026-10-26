import { describe, expect, it } from 'vitest';
import { createMobileProductFormSchema } from '../../../../../shared-utils/mobileProductFormSchema';
import { PRODUCT_SUPPLIER_REQUIRED_MESSAGE } from '../../../../../shared-utils/productSupplierRequirement';
import { PRODUCT_NAME_REQUIRED_MESSAGE } from '../../../../../shared-utils/productNameRequirement';
import { PRODUCT_CATEGORY_REQUIRED_MESSAGE } from '../../../../../shared-utils/productCategoryRequirement';
import { PRODUCT_COMPOSITION_PRODUCT_COMPONENTS_REQUIRED_MESSAGE } from '../../../../../shared-utils/productCompositionRequirements';
import { resolveMobileProductFormErrorNavigation } from './mobileProductFormErrorNavigation';

describe('mobileProductFormSchema - single variation error routing', () => {
  const baseValidProduct = {
    name: 'Guarda Roupa Paris',
    productKind: 'normal',
    categoryId: 'cat-1',
    categoryIds: ['cat-1'],
    mainSupplierId: 'sup-1',
    unitPrice: '1500,00',
    images: ['parent-photo.jpg'],
    width: '200',
    height: '220',
    depth: '60',
    merchandiseOrigin: 'third_party',
    technicalValues: {
      Marca: 'Morante',
      Modelo: 'Paris',
    },
    variations: [
      {
        id: 'var-1',
        sku: '000312-01',
        name: 'Branco',
        syncUnitPrice: true,
        syncWidth: true,
        syncHeight: true,
        syncDepth: true,
        attributes: [{ name: 'Cor', value: 'Branco' }],
      },
    ],
  };

  it('valida com sucesso um produto com variação única completa', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const parsed = schema.safeParse(baseValidProduct);
    expect(parsed.success).toBe(true);
  });

  it('exige categoria com o caminho e a mensagem de domínio do ERP', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const parsed = schema.safeParse({
      ...baseValidProduct,
      categoryIds: [],
      categoryId: '',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['categoryIds'],
          message: PRODUCT_CATEGORY_REQUIRED_MESSAGE,
        })
      );
    }
  });

  it('preserva a categoria singular legada do mobile', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });

    expect(
      schema.safeParse({
        ...baseValidProduct,
        categoryIds: [],
        categoryId: 'legacy-category',
      }).success
    ).toBe(true);
  });

  it('continua permitindo rascunho sem categoria', () => {
    const schema = createMobileProductFormSchema({
      draft: true,
      isStockistOnly: false,
      published: false,
    });

    expect(
      schema.safeParse({
        ...baseValidProduct,
        categoryIds: [],
        categoryId: '',
      }).success
    ).toBe(true);
  });

  it('exige custo da NF-e para concluir cadastro rápido e aceita custo zero', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
      requireInboundCostPrice: true,
    });
    const missing = schema.safeParse({ ...baseValidProduct, costPrice: '' });
    const zero = schema.safeParse({ ...baseValidProduct, costPrice: '0' });

    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['costPrice'],
          message: 'Informe um custo de aquisição válido.',
        })
      );
    }
    expect(zero.success).toBe(true);
  });

  it('usa a mensagem ERP e rejeita custo de aquisição negativo no cadastro rápido', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
      requireInboundCostPrice: true,
    });
    const parsed = schema.safeParse({ ...baseValidProduct, costPrice: '-1' });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['costPrice'],
          message: 'O custo de aquisição deve ser maior ou igual a zero.',
        })
      );
    }
  });

  it('permite custo ainda vazio ao salvar rascunho de cadastro rápido', () => {
    const schema = createMobileProductFormSchema({
      draft: true,
      isStockistOnly: false,
      published: false,
      requireInboundCostPrice: true,
    });

    expect(schema.safeParse({ ...baseValidProduct, costPrice: '' }).success).toBe(true);
  });

  it.each([false, true])('aceita nome de um caractere no formulário quando rascunho=%s', (draft) => {
    const schema = createMobileProductFormSchema({
      draft,
      isStockistOnly: false,
      published: false,
    });

    expect(schema.safeParse({ ...baseValidProduct, name: 'A' }).success).toBe(true);
  });

  it.each([false, true])('rejeita nome vazio após trim quando rascunho=%s', (draft) => {
    const schema = createMobileProductFormSchema({
      draft,
      isStockistOnly: false,
      published: false,
    });
    const parsed = schema.safeParse({ ...baseValidProduct, name: '   ' });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['name'],
          message: PRODUCT_NAME_REQUIRED_MESSAGE,
        })
      );
    }
  });

  it.each([false, true])('bloqueia Estoque Mínimo negativo em rascunho=%s', (draft) => {
    const schema = createMobileProductFormSchema({
      draft,
      isStockistOnly: false,
      published: false,
    });
    const parsed = schema.safeParse({ ...baseValidProduct, minStock: -1 });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['minStock'],
          message: 'Informe um número finito maior ou igual a zero.',
        })
      );
    }
  });

  it('exige fornecedor ao finalizar terceiros com a mensagem ERP e preserva o destino da aba', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const parsed = schema.safeParse({
      ...baseValidProduct,
      mainSupplierId: undefined,
      supplierId: undefined,
      merchandiseOrigin: 'third_party',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['estoque'],
          message: PRODUCT_SUPPLIER_REQUIRED_MESSAGE,
        })
      );
    }
  });

  it('permite finalizar fabricação própria sem fornecedor', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const parsed = schema.safeParse({
      ...baseValidProduct,
      mainSupplierId: undefined,
      supplierId: undefined,
      merchandiseOrigin: 'own_production',
      isOwnProduction: true,
    });

    expect(parsed.success).toBe(true);
  });

  it('retorna erro de forma para uma variação nula sem lançar exceção', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });

    expect(() =>
      schema.safeParse({
        ...baseValidProduct,
        variations: [null],
      })
    ).not.toThrow();
    expect(
      schema.safeParse({
        ...baseValidProduct,
        variations: [null],
      }).success
    ).toBe(false);
  });

  it('preserva o ambiente derivado das categorias no payload validado', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const parsed = schema.safeParse({
      ...baseValidProduct,
      title: 'Guarda Roupa Aurora',
      marketplaceTitle: 'Guarda Roupa Aurora',
      environment: 'QUARTO',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.environment).toBe('QUARTO');
      expect(parsed.data.title).toBe('Guarda Roupa Aurora');
      expect(parsed.data.marketplaceTitle).toBe('Guarda Roupa Aurora');
    }
  });

  it('exige pelo menos duas variações quando o modo múltiplo está selecionado', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const parsed = schema.safeParse({
      ...baseValidProduct,
      hasVariations: true,
      variations: [baseValidProduct.variations[0]],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('pelo menos 2 variações'))).toBe(true);
    }
  });

  it('rejeita nomes completos repetidos mesmo com combinações de atributos diferentes', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const parsed = schema.safeParse({
      ...baseValidProduct,
      hasVariations: true,
      variations: [
        { ...baseValidProduct.variations[0], name: 'Branco' },
        {
          ...baseValidProduct.variations[0],
          id: 'var-2',
          sku: '000312-02',
          name: 'Bránco',
          images: ['variation-2.jpg'],
          attributes: [{ name: 'Cor', value: 'Preto' }],
        },
      ],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('nomes completos'))).toBe(true);
    }
  });

  it('exige foto própria em cada variação múltipla e permite a foto do pai no modo simples', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const multiWithoutChildPhoto = schema.safeParse({
      ...baseValidProduct,
      hasVariations: true,
      variations: [
        { ...baseValidProduct.variations[0], images: ['variation-1.jpg'] },
        {
          ...baseValidProduct.variations[0],
          id: 'var-2',
          sku: '000312-02',
          name: 'Preto',
          images: [],
          attributes: [{ name: 'Cor', value: 'Preto' }],
        },
      ],
    });

    expect(multiWithoutChildPhoto.success).toBe(false);
    if (!multiWithoutChildPhoto.success) {
      expect(multiWithoutChildPhoto.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['variacoes', 1, 'images'],
          message: 'A variação "Preto" deve ter pelo menos 1 foto vinculada para concluir o cadastro.',
        })
      );
    }

    const simpleWithParentPhoto = schema.safeParse({
      ...baseValidProduct,
      variations: [{ ...baseValidProduct.variations[0], images: [] }],
    });
    expect(simpleWithParentPhoto.success).toBe(true);

    const simpleWithoutAnyPhoto = schema.safeParse({
      ...baseValidProduct,
      images: [],
      variations: [{ ...baseValidProduct.variations[0], images: [] }],
    });
    expect(simpleWithoutAnyPhoto.success).toBe(false);
    if (!simpleWithoutAnyPhoto.success) {
      expect(simpleWithoutAnyPhoto.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['variacoes', 0, 'images'],
          message: 'A variação "Branco" deve ter pelo menos 1 foto vinculada para concluir o cadastro.',
        })
      );
    }
  });

  it('permite salvar rascunho sem fotos vinculadas', () => {
    const draftSchema = createMobileProductFormSchema({
      draft: true,
      isStockistOnly: false,
      published: false,
    });
    const incompleteDraft = {
      ...baseValidProduct,
      images: [],
      variations: [{ ...baseValidProduct.variations[0], images: [] }],
    };

    expect(draftSchema.safeParse(incompleteDraft).success).toBe(true);
  });

  it('preserva galerias simples legadas acima de 75 fotos e impede novas inclusões', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
      existingProductImageCount: 80,
    });
    const legacyProduct = {
      ...baseValidProduct,
      images: Array.from({ length: 80 }, (_, index) => `parent-${index}.jpg`),
      variations: [{ ...baseValidProduct.variations[0], images: [] }],
    };

    expect(schema.safeParse(legacyProduct).success).toBe(true);
    const parsed = schema.safeParse({
      ...legacyProduct,
      images: [...legacyProduct.images, 'parent-new.jpg'],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('75 fotos'))).toBe(true);
    }
  });

  it('exige oportunidade ao finalizar produto salvado fora do perfil de estoque', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const parsed = schema.safeParse({ ...baseValidProduct, productKind: 'salvado' });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('oportunidade'))).toBe(true);
    }
  });

  it('permite cadastro com variação única sem dimensões (exigidas apenas na publicação)', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const productWithoutDimensions = {
      ...baseValidProduct,
      width: '',
      height: '',
      depth: '',
    };
    const parsed = schema.safeParse(productWithoutDimensions);
    expect(parsed.success).toBe(true);
  });

  it('bloqueia produto publicado sem requisitos obrigatórios do catálogo digital', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: true,
    });
    const invalidProduct = {
      ...baseValidProduct,
      width: '',
      height: '',
      depth: '',
    };
    const parsed = schema.safeParse(invalidProduct);
    expect(parsed.success).toBe(false);
  });

  it('permite salvar variação única inativa de composição sem os componentes finais', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const composition = {
      ...baseValidProduct,
      itemType: 'composition',
      active: false,
      comboItems: [],
      variations: [{ ...baseValidProduct.variations[0], active: false, comboItems: [] }],
    };

    expect(schema.safeParse(composition).success).toBe(true);
    expect(schema.safeParse({
      ...composition,
      variations: [{
        ...composition.variations[0],
        comboItems: [{
          productId: 'component-1',
          variationId: 'variation-1',
          quantity: 1,
          description: 'Cadeira Aurora',
        }],
      }],
    }).success).toBe(true);
    expect(schema.safeParse({
      ...composition,
      variations: [{
        ...composition.variations[0],
        comboItems: [{ productId: 'simple-component', variationId: null, quantity: 1, description: 'Mesa Aurora' }],
      }],
    }).success).toBe(true);
  });

  it('exige dois componentes para cada variação ativa de uma composição em família', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const component = (id: string) => ({
      productId: id,
      variationId: `${id}-variation`,
      quantity: 1,
      description: `Componente ${id}`,
    });
    const composition = {
      ...baseValidProduct,
      itemType: 'composition',
      hasVariations: true,
      variations: [
        {
          ...baseValidProduct.variations[0],
          id: 'variation-1',
          active: true,
          attributes: [{ name: 'Cor', value: 'Branco' }],
          images: ['white.jpg'],
          comboItems: [component('base-1'), component('base-2')],
        },
        {
          ...baseValidProduct.variations[0],
          id: 'variation-2',
          sku: '000312-02',
          name: 'Preto',
          active: true,
          attributes: [{ name: 'Cor', value: 'Preto' }],
          images: ['black.jpg'],
          comboItems: [component('part-1')],
        },
      ],
    };

    const activeIncomplete = schema.safeParse(composition);
    expect(activeIncomplete.success).toBe(false);
    if (!activeIncomplete.success) {
      expect(activeIncomplete.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['variacoes', 1, 'comboItems'],
          message: 'Vincule pelo menos 2 produtos componentes para manter ativa esta variação de composição.',
        })
      );
    }

    expect(schema.safeParse({
      ...composition,
      variations: composition.variations.map((variation) => ({
        ...variation,
        active: false,
        comboItems: [],
      })),
    }).success).toBe(true);
  });

  it('exige dois componentes na composição simples ativa e direciona para a aba Composição', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const component = (id: string) => ({
      productId: id,
      variationId: null,
      quantity: 1,
      description: `Componente ${id}`,
    });
    const product = {
      ...baseValidProduct,
      itemType: 'composition',
      active: true,
      comboItems: [component('base')],
      variations: [{ ...baseValidProduct.variations[0], active: false, comboItems: [] }],
    };
    const parsed = schema.safeParse(product);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(expect.objectContaining({
        path: ['composicao'],
        message: PRODUCT_COMPOSITION_PRODUCT_COMPONENTS_REQUIRED_MESSAGE,
      }));
    }
    expect(resolveMobileProductFormErrorNavigation('composicao')).toEqual({ tab: 'composicao' });
    expect(resolveMobileProductFormErrorNavigation('comboItems_0')).toEqual({ tab: 'composicao' });

    expect(schema.safeParse({ ...product, comboItems: [component('base'), component('seat')] }).success).toBe(true);
  });

  it('mantém composição simples incompleta editável em rascunho ou quando inativa', () => {
    const finalSchema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const draftSchema = createMobileProductFormSchema({
      draft: true,
      isStockistOnly: false,
      published: false,
    });
    const product = {
      ...baseValidProduct,
      itemType: 'composition',
      active: true,
      comboItems: [],
      variations: [{ ...baseValidProduct.variations[0], comboItems: [] }],
    };

    expect(draftSchema.safeParse(product).success).toBe(true);
    expect(finalSchema.safeParse({ ...product, active: false }).success).toBe(true);
  });

  it('direciona o erro de composição ao painel correto da variação', () => {
    expect(resolveMobileProductFormErrorNavigation('variacoes_1_comboItems')).toEqual({
      tab: 'variacoes',
      variationIndex: 1,
      variationPanel: 'compostos',
    });
  });

  it('barra componentes incompletos ou com quantidade menor que um ao finalizar', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const composition = {
      ...baseValidProduct,
      itemType: 'composition',
      variations: [{
        ...baseValidProduct.variations[0],
        comboItems: [{
          productId: 'component-1',
          variationId: 'variation-1',
          quantity: 0,
          description: '',
        }],
      }],
    };
    const parsed = schema.safeParse(composition);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('produto de cada componente'))).toBe(true);
      expect(parsed.error.issues.some((issue) => issue.message.includes('quantidade maior ou igual a um'))).toBe(true);
    }
  });

  it('preserva componentes incompletos em rascunhos sem permitir concluir depois sem corrigi-los', () => {
    const composition = {
      ...baseValidProduct,
      itemType: 'composition',
      variations: [{
        ...baseValidProduct.variations[0],
        comboItems: [{ productId: '', quantity: '' }],
      }],
    };
    const draftSchema = createMobileProductFormSchema({
      draft: true,
      isStockistOnly: false,
      published: false,
    });
    const finalSchema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });

    expect(draftSchema.safeParse(composition).success).toBe(true);
    expect(finalSchema.safeParse(composition).success).toBe(false);
  });

  it('preserva o índice e o campo de preço próprio inválido da variação na submissão', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const multiVariationProduct = {
      ...baseValidProduct,
      variations: [
        { ...baseValidProduct.variations[0], images: ['variation-1.jpg'] },
        {
          id: 'var-2',
          sku: '000312-02',
          name: 'Preto',
          syncUnitPrice: false,
          price: '', // sem preço
          syncWidth: true,
          syncHeight: true,
          syncDepth: true,
          images: ['variation-2.jpg'],
          attributes: [{ name: 'Cor', value: 'Preto' }],
        },
      ],
    };
    const parsed = schema.safeParse(multiVariationProduct);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['variacoes', 1, 'price'],
          message: 'Preço de Venda deve ser maior que zero.',
        })
      );
    }
  });

  it('direciona preço herdado zerado para a primeira variação que o herda', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const multiVariationProduct = {
      ...baseValidProduct,
      unitPrice: '0',
      hasVariations: true,
      variations: [
        { ...baseValidProduct.variations[0], images: ['variation-1.jpg'] },
        {
          ...baseValidProduct.variations[0],
          id: 'var-2',
          sku: '000312-02',
          name: 'Preto',
          images: ['variation-2.jpg'],
          attributes: [{ name: 'Cor', value: 'Preto' }],
        },
      ],
    };

    const parsed = schema.safeParse(multiVariationProduct);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['variacoes', 0, 'price'],
          message: 'Preço de Venda deve ser maior que zero.',
        })
      );
      expect(parsed.error.issues).not.toContainEqual(
        expect.objectContaining({
          path: ['estoque'],
          message: 'Informe o preço de venda do produto.',
        })
      );
    }
  });

  it.each([
    ['discountPercent', '101', 'Informe um desconto percentual entre zero e 100.'],
    ['discountFixed', '151', 'O desconto em reais deve ficar entre zero e o preço de venda.'],
  ] as const)('bloqueia %s inválido na submissão da família de variações', (field, value, message) => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const multiVariationProduct = {
      ...baseValidProduct,
      hasVariations: true,
      variations: [
        {
          ...baseValidProduct.variations[0],
          syncUnitPrice: false,
          price: '150',
          images: ['variation-1.jpg'],
          [field]: value,
        },
        {
          ...baseValidProduct.variations[0],
          id: 'var-2',
          sku: '000312-02',
          name: 'Preto',
          syncUnitPrice: false,
          price: '150',
          images: ['variation-2.jpg'],
          attributes: [{ name: 'Cor', value: 'Preto' }],
        },
      ],
    };

    const parsed = schema.safeParse(multiVariationProduct);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['variacoes', 0, field],
          message,
        })
      );
    }
  });

  it('permite desconto incompleto no rascunho e valida o limite na finalização', () => {
    const schema = createMobileProductFormSchema({
      draft: true,
      isStockistOnly: false,
      published: false,
    });
    const draftWithInvalidVariationDiscount = {
      ...baseValidProduct,
      variations: [
        {
          ...baseValidProduct.variations[0],
          syncUnitPrice: false,
          price: '150',
          discountPercent: '-1',
        },
        {
          ...baseValidProduct.variations[0],
          id: 'var-2',
          sku: '000312-02',
          name: 'Preto',
          syncUnitPrice: false,
          price: '150',
          attributes: [{ name: 'Cor', value: 'Preto' }],
        },
      ],
    };

    expect(schema.safeParse(draftWithInvalidVariationDiscount).success).toBe(true);

    const finalSchema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const finalized = finalSchema.safeParse(draftWithInvalidVariationDiscount);
    expect(finalized.success).toBe(false);
    if (!finalized.success) {
      expect(finalized.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['variacoes', 0, 'discountPercent'],
          message: 'Informe um desconto percentual entre zero e 100.',
        })
      );
    }
  });

  it('permite salvar rascunho mesmo com dados incompletos', () => {
    const schema = createMobileProductFormSchema({
      draft: true,
      isStockistOnly: false,
      published: false,
    });
    const incompleteDraft = {
      name: 'Rascunho de Produto',
    };
    const parsed = schema.safeParse(incompleteDraft);
    expect(parsed.success).toBe(true);
  });
});
