import { describe, expect, it } from 'vitest';
import { createReconciliationBatchFormSchema } from '../../../../../shared-utils/reconciliationFormSchemas';

describe('schema RHF/Zod das operações em lote de conciliação', () => {
  it('só aceita fornecedor e categoria disponíveis na seleção atual', () => {
    const schema = createReconciliationBatchFormSchema({
      supplierIds: ['supplier-1'],
      categoryIds: ['category-1'],
    });

    expect(schema.safeParse({ operation: 'supplier', productIds: ['product-1'], supplierId: 'other', replaceExisting: false }).success).toBe(false);
    expect(schema.safeParse({ operation: 'category', productIds: ['product-1'], categoryId: 'other' }).success).toBe(false);
  });

  it('normaliza o NCM e valida os tipos de atributo do contrato ERP', () => {
    const ncmSchema = createReconciliationBatchFormSchema({});
    expect(ncmSchema.parse({ operation: 'ncm', productIds: ['product-1'], ncm: '9403.50.00' })).toMatchObject({ ncm: '94035000' });

    const attributeSchema = createReconciliationBatchFormSchema({
      attributes: [{ name: 'Quantidade', dataType: 'integer' }],
    });
    expect(attributeSchema.safeParse({ operation: 'attribute', productIds: ['product-1'], name: 'Quantidade', value: '1.5' }).success).toBe(false);
    expect(attributeSchema.safeParse({ operation: 'attribute', productIds: ['product-1'], name: 'Quantidade', value: '2' }).success).toBe(true);
  });

  it('rejeita seleção vazia e IDs repetidos antes da mutação', () => {
    const schema = createReconciliationBatchFormSchema({});
    expect(schema.safeParse({ operation: 'ncm', productIds: [], ncm: '94035000' }).success).toBe(false);
    expect(schema.safeParse({ operation: 'ncm', productIds: ['product-1', 'product-1'], ncm: '94035000' }).success).toBe(false);
  });
});
