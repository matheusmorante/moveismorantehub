import {
  reconciliationAttributeValueSchema,
  reconciliationBatchFormSchema,
  type ReconciliationBatchInput,
  type ReconciliationResult,
} from './reconciliationFormSchemas';

const confirmedRows = (result: { data: unknown; error: unknown }) => {
  if (result.error) throw result.error;
  if (!Array.isArray(result.data) || result.data.length === 0) {
    throw new Error('Nenhum registro foi confirmado. Confira o cadastro e a permissão de edição.');
  }
  return result.data.length;
};

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
      updated = confirmedRows(
        await client
          .from('products')
          .update({ category_id: values.categoryId })
          .in('id', values.productIds)
          .select('id')
      );
      if (updated !== values.productIds.length) {
        throw new Error('Nem todos os produtos foram confirmados. Confira a seleção e as permissões.');
      }
      const { error: deleteError } = await client
        .from('product_categories')
        .delete()
        .in('product_id', values.productIds);
      if (deleteError) throw deleteError;
      const { error: insertError } = await client
        .from('product_categories')
        .insert(values.productIds.map((id) => ({ product_id: id, category_id: values.categoryId })));
      if (insertError) throw insertError;
      return { success: true, updated };
    }

    if (values.operation === 'ncm') {
      for (const id of values.productIds) {
        const { data: product, error } = await client
          .from('products')
          .select('fiscal')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (!product) throw new Error('Produto não encontrado para a correção de NCM.');
        if (
          product.fiscal != null &&
          (typeof product.fiscal !== 'object' || Array.isArray(product.fiscal))
        ) {
          throw new Error('Os dados fiscais atuais precisam de revisão antes de alterar o NCM.');
        }
        const fiscal = { ...(product.fiscal || {}), ncm: values.ncm };
        updated += confirmedRows(
          await client.from('products').update({ fiscal }).eq('id', id).select('id')
        );
      }
      return { success: true, updated };
    }

    const { data: variations, error } = await client
      .from('product_variations')
      .select('id, product_id, attributes')
      .in('product_id', values.productIds);
    if (error) throw error;
    if (!Array.isArray(variations)) {
      throw new Error('Não foi possível ler as variações para a correção.');
    }
    for (const variation of variations) {
      const stored =
        typeof variation.attributes === 'string'
          ? JSON.parse(variation.attributes)
          : variation.attributes ?? [];
      const attributes = reconciliationAttributeValueSchema.array().parse(stored);
      const existing = attributes.findIndex(
        (attribute) => attribute.name.toLowerCase() === values.name.toLowerCase()
      );
      if (existing >= 0) {
        attributes[existing] = { ...attributes[existing], value: values.value };
      } else {
        attributes.push({ name: values.name, value: values.value, showName: true });
      }
      updated += confirmedRows(
        await client
          .from('product_variations')
          .update({ attributes })
          .eq('id', variation.id)
          .in('product_id', values.productIds)
          .select('id')
      );
    }
    return { success: true, updated };
  } catch (cause) {
    return failure(cause, updated);
  }
}
