import { describe, expect, it } from 'vitest';
import { createMobileProductFormSchema } from '../../../../../shared-utils/mobileProductFormSchema';
import { PRODUCT_NAME_REQUIRED_MESSAGE } from '../../../../../shared-utils/productNameRequirement';
import { PRODUCT_SUPPLIER_REQUIRED_MESSAGE } from '../../../../../shared-utils/productSupplierRequirement';
import { baseValidProduct } from './mobileProductFormSchemaTestFixtures';

describe('Regras de cadastro e finalização dos campos do produto', () => {
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
});
