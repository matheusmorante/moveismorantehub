import { describe, expect, it } from 'vitest';
import { createProductVariationSubmissionSchema } from '../../../../../../../shared-utils/productVariationValidation';

describe('createProductVariationSubmissionSchema discount bounds', () => {
  it('reports percent and fixed-discount limits for an independently priced variation', () => {
    const schema = createProductVariationSubmissionSchema(
      {
        id: 'parent',
        name: 'Mesa retrô',
        description: 'Mesa retrô',
        categoryIds: ['category-1'],
        mainSupplierId: 'supplier-1',
        unitPrice: 100,
        width: 80,
        height: 90,
        depth: 50,
        technicalValues: { Marca: 'Morante', Modelo: 'Retrô' },
      } as Parameters<typeof createProductVariationSubmissionSchema>[0],
      false
    );
    const parsed = schema.safeParse({
      variation: {
        id: 'variation-1',
        sku: 'MESA-01',
        name: 'Mesa retrô preta',
        stock: 1,
        unitPrice: 100,
        active: false,
        attributes: [{ name: 'Cor', value: 'Preto' }],
        syncUnitPrice: false,
        syncPromoPrice: false,
        syncWidth: false,
        syncHeight: false,
        syncDepth: false,
        width: 80,
        height: 90,
        depth: 50,
        technicalValues: { Marca: 'Morante', Modelo: 'Retrô' },
      },
      discountPercent: '101',
      discountFixed: '101',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['discountPercent'],
          message: 'Informe um desconto percentual entre zero e 100.',
        })
      );
      expect(parsed.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['discountFixed'],
          message: 'O desconto em reais deve ficar entre zero e o preço de venda.',
        })
      );
    }
  });
});
