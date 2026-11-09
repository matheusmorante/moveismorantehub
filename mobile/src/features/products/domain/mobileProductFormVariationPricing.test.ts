import { describe, expect, it } from 'vitest';
import { createMobileProductFormSchema } from '../../../../../shared-utils/mobileProductFormSchema';
import { baseValidProduct } from './mobileProductFormSchemaTestFixtures';

describe('mobileProductFormSchema - variation price and discount validation', () => {
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
});
