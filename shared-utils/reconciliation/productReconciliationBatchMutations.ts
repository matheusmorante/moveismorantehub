import {
  reconciliationBatchFormSchema,
  type ReconciliationBatchInput,
  type ReconciliationResult,
} from '../reconciliationFormSchemas';

const failure = (cause: unknown, updated = 0): ReconciliationResult => {
  const error = cause as { message?: string; issues?: Array<{ message: string }> } | null;
  return {
    success: false,
    updated,
    error:
      error?.issues?.[0]?.message ||
      error?.message ||
      'Não foi possível confirmar a atualização. Confira os registros antes de repetir.',
  };
};

/** Batch persistence shared by the ERP and the native reconciliation screen. */
export async function applyProductReconciliationBatchWithClient(
  client: any,
  input: ReconciliationBatchInput
): Promise<ReconciliationResult> {
  let updated = 0;

  try {
    const values = reconciliationBatchFormSchema.parse(input);

    if (values.operation === 'supplier') {
      for (let start = 0; start < values.productIds.length; start += 50) {
        let query = client
          .from('products')
          .update({ main_supplier_id: values.supplierId, supplier_id: values.supplierId })
          .in('id', values.productIds.slice(start, start + 50));
        if (!values.replaceExisting) query = query.is('main_supplier_id', null);
        const result = await query.select('id');
        if (result.error) throw result.error;
        if (!Array.isArray(result.data)) {
          throw new Error('A atualização de fornecedores não retornou confirmação.');
        }
        updated += result.data.length;
      }
      return { success: true, updated };
    }

    if (values.operation === 'category') {
      const { data, error } = await client.rpc('apply_product_reconciliation_category_batch', {
        p_product_ids: values.productIds,
        p_category_id: values.categoryId,
      });
      if (error) throw error;
      if (typeof data !== 'number' || !Number.isInteger(data) || data < 0) {
        throw new Error('A atualização de categorias não retornou confirmação. Confira os registros antes de repetir.');
      }
      updated = data;
      if (updated !== values.productIds.length) {
        throw new Error('Nem todos os produtos foram confirmados. Confira a seleção e as permissões.');
      }
      return { success: true, updated };
    }

    if (values.operation === 'ncm') {
      const { data, error } = await client.rpc('apply_product_reconciliation_ncm_batch', {
        p_product_ids: values.productIds,
        p_ncm: values.ncm,
      });
      if (error) throw error;
      if (typeof data !== 'number' || !Number.isInteger(data) || data < 0) {
        throw new Error('A atualização de NCM não retornou confirmação. Confira os produtos antes de repetir.');
      }
      updated = data;
      if (updated !== values.productIds.length) {
        throw new Error('Nem todos os produtos foram confirmados. Confira a seleção e as permissões.');
      }
      return { success: true, updated };
    }

    const { data, error } = await client.rpc('apply_product_reconciliation_attribute_batch', {
      p_product_ids: values.productIds,
      p_name: values.name,
      p_value: values.value,
    });
    if (error) throw error;
    if (typeof data !== 'number' || !Number.isInteger(data) || data < 0) {
      throw new Error('A atualização das características não retornou confirmação. Confira os registros antes de repetir.');
    }
    updated = data;
    return { success: true, updated };
  } catch (cause) {
    return failure(cause, updated);
  }
}
