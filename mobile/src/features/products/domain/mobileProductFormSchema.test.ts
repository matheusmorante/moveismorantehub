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
