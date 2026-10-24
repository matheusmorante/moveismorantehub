import {
  reconciliationProductFormSchema,
  type ReconciliationProductValues,
  type ReconciliationResult,
} from './reconciliationFormSchemas';

const failure = (cause: unknown): ReconciliationResult => {
  const error = cause as { message?: string; issues?: Array<{ message: string }> } | null;
  return {
    success: false,
    error:
      error?.issues?.[0]?.message ||
      error?.message ||
      'Não foi possível confirmar a atualização. Confira os registros antes de repetir.',
  };
};

const confirmedRows = (result: { data: unknown; error: unknown }) => {
  if (result.error) throw result.error;
  if (!Array.isArray(result.data) || result.data.length === 0) {
    throw new Error('Nenhum registro foi confirmado. Confira o cadastro e a permissão de edição.');
  }
  return result.data.length;
};

/** Shared persistence contract for the ERP reconciliation card and its mobile adapter. */
export async function saveProductReconciliationWithClient(
  client: any,
  productUpdates: ReconciliationProductValues['productUpdates'],
  variationUpdates?: ReconciliationProductValues['variationUpdates']
): Promise<ReconciliationResult> {
  try {
    const values = reconciliationProductFormSchema.parse({ productUpdates, variationUpdates });
    const product = values.productUpdates;
    const payload: Record<string, unknown> = {};

    if (product.mainSupplierId !== undefined) {
      payload.main_supplier_id = product.mainSupplierId;
      payload.supplier_id = product.mainSupplierId;
    }
    if (product.categoryId !== undefined) {
      const { error: deleteError } = await client
        .from('product_categories')
        .delete()
        .eq('product_id', product.id);
      if (deleteError) throw deleteError;
      const { error: insertError } = await client
        .from('product_categories')
        .insert([{ product_id: product.id, category_id: product.categoryId }]);
      if (insertError) throw insertError;
      payload.category_id = product.categoryId;
    }
    if (product.price !== undefined) payload.price = product.price;
    if (product.ncm !== undefined) {
      const { data: current, error } = await client
        .from('products')
        .select('fiscal')
        .eq('id', product.id)
        .single();
      if (error) throw error;
      if (
        !current ||
        (current.fiscal != null &&
          (typeof current.fiscal !== 'object' || Array.isArray(current.fiscal)))
      ) {
        throw new Error('Os dados fiscais atuais precisam de revisão antes de alterar o NCM.');
      }
      payload.fiscal = { ...(current.fiscal || {}), ncm: product.ncm };
    }
    if (Object.keys(payload).length) {
      confirmedRows(await client.from('products').update(payload).eq('id', product.id).select('id'));
    }

    for (const variation of values.variationUpdates) {
      const update: Record<string, unknown> = {};
      if (variation.price !== undefined) update.price = variation.price;
      if (variation.attributes !== undefined) update.attributes = variation.attributes;
      if (Object.keys(update).length) {
        confirmedRows(
          await client
            .from('product_variations')
            .update(update)
            .eq('id', variation.id)
            .eq('product_id', product.id)
            .select('id')
        );
      }
    }
    return { success: true };
  } catch (error) {
    return failure(error);
  }
}
