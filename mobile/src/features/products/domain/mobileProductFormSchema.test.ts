import { describe, expect, it } from 'vitest';
import { createMobileProductFormSchema } from '../../../../../shared-utils/mobileProductFormSchema';

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
      expect(multiWithoutChildPhoto.error.issues.some((issue) => issue.message.includes('Preto') && issue.message.includes('foto'))).toBe(true);
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
      expect(simpleWithoutAnyPhoto.error.issues.some((issue) => issue.message.includes('foto'))).toBe(true);
    }
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

  it('permite composição sem componentes ou com um componente, como no ERP', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const composition = {
      ...baseValidProduct,
      itemType: 'composition',
      comboItems: [],
      variations: [{ ...baseValidProduct.variations[0], comboItems: [] }],
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

  it('redireciona erro para aba variacoes quando há múltiplas variações e uma delas está inválida', () => {
    const schema = createMobileProductFormSchema({
      draft: false,
      isStockistOnly: false,
      published: false,
    });
    const multiVariationProduct = {
      ...baseValidProduct,
      variations: [
        baseValidProduct.variations[0],
        {
          id: 'var-2',
          sku: '000312-02',
          name: 'Preto',
          syncUnitPrice: false,
          price: '', // sem preço
          syncWidth: true,
          syncHeight: true,
          syncDepth: true,
          attributes: [{ name: 'Cor', value: 'Preto' }],
        },
      ],
    };
    const parsed = schema.safeParse(multiVariationProduct);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((i) => i.path[0]);
      expect(paths).toContain('variacoes');
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
