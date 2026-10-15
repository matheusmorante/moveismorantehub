import { supabase } from '../../../../utils/supabaseConfig';
import { reconciliationSupplierFormSchema, reconciliationCategoryFormSchema, reconciliationNcmFormSchema, reconciliationAttributeFormSchema,
  reconciliationProductFormSchema, reconciliationAttributeValueSchema, type ReconciliationProductValues } from '../../../../../../../shared-utils/reconciliationFormSchemas';

const failure = (cause: unknown, updated = 0) => {
  const error = cause as { message?: string; issues?: Array<{ message: string }> } | null;
  return { success: false, updated, error: error?.issues?.[0]?.message || error?.message || 'Não foi possível confirmar a atualização. Confira os registros antes de repetir.' };
};
const confirmedRows = (result: { data: unknown; error: unknown }) => {
  if (result.error) throw result.error;
  if (!Array.isArray(result.data) || result.data.length === 0) throw new Error('Nenhum registro foi confirmado. Confira o cadastro e a permissão de edição.');
  return result.data.length;
};

export async function applySupplierBatch(productIds: string[], supplierId: string, replaceExisting = true): Promise<{ success: boolean; updated: number; error?: string }> {
  let updated = 0;
  try {
    const values = reconciliationSupplierFormSchema.parse({ operation: 'supplier', productIds, supplierId, replaceExisting });
    for (let start = 0; start < values.productIds.length; start += 50) {
      let query = supabase.from('products').update({ main_supplier_id: values.supplierId, supplier_id: values.supplierId }).in('id', values.productIds.slice(start, start + 50));
      if (!values.replaceExisting) query = query.is('main_supplier_id', null);
      const result = await query.select('id');
      if (result.error) throw result.error;
      if (!Array.isArray(result.data)) throw new Error('A atualização de fornecedores não retornou confirmação.');
      updated += result.data.length;
    }
    return { success: true, updated };
  } catch (error) { return failure(error, updated); }
}

export async function applyCategoryBatch(productIds: string[], categoryId: string): Promise<{ success: boolean; updated: number; error?: string }> {
  let updated = 0;
  try {
    const values = reconciliationCategoryFormSchema.parse({ operation: 'category', productIds, categoryId });
    updated = confirmedRows(await supabase.from('products').update({ category_id: values.categoryId }).in('id', values.productIds).select('id'));
    if (updated !== values.productIds.length) throw new Error('Nem todos os produtos foram confirmados. Confira a seleção e as permissões.');
    const { error: deleteError } = await supabase.from('product_categories').delete().in('product_id', values.productIds);
    if (deleteError) throw deleteError;
    const { error: insertError } = await supabase.from('product_categories').insert(values.productIds.map((id) => ({ product_id: id, category_id: values.categoryId })));
    if (insertError) throw insertError;
    return { success: true, updated };
  } catch (error) { return failure(error, updated); }
}

export async function applyNcmBatch(productIds: string[], ncm: string): Promise<{ success: boolean; updated: number; error?: string }> {
  let updated = 0;
  try {
    const values = reconciliationNcmFormSchema.parse({ operation: 'ncm', productIds, ncm });
    for (const id of values.productIds) {
      const { data: product, error } = await supabase.from('products').select('fiscal').eq('id', id).single();
      if (error) throw error;
      if (!product) throw new Error('Produto não encontrado para a correção de NCM.');
      if (product.fiscal != null && (typeof product.fiscal !== 'object' || Array.isArray(product.fiscal))) throw new Error('Os dados fiscais atuais precisam de revisão antes de alterar o NCM.');
      const fiscal = { ...(product.fiscal || {}), ncm: values.ncm };
      updated += confirmedRows(await supabase.from('products').update({ fiscal }).eq('id', id).select('id'));
    }
    return { success: true, updated };
  } catch (error) { return failure(error, updated); }
}

export async function applyAttributeBatch(productIds: string[], attributeName: string, attributeValue: string): Promise<{ success: boolean; updated: number; error?: string }> {
  let updated = 0;
  try {
    const values = reconciliationAttributeFormSchema.parse({ operation: 'attribute', productIds, name: attributeName, value: attributeValue });
    const { data: variations, error } = await supabase.from('product_variations').select('id, product_id, attributes').in('product_id', values.productIds);
    if (error) throw error;
    if (!Array.isArray(variations)) throw new Error('Não foi possível ler as variações para a correção.');
    for (const variation of variations) {
      const stored = typeof variation.attributes === 'string' ? JSON.parse(variation.attributes) : variation.attributes ?? [];
      const attributes = reconciliationAttributeValueSchema.array().parse(stored);
      const existing = attributes.findIndex((attribute) => attribute.name.toLowerCase() === values.name.toLowerCase());
      if (existing >= 0) attributes[existing] = { ...attributes[existing], value: values.value };
      else attributes.push({ name: values.name, value: values.value, showName: true });
      updated += confirmedRows(await supabase.from('product_variations').update({ attributes }).eq('id', variation.id).in('product_id', values.productIds).select('id'));
    }
    return { success: true, updated };
  } catch (error) { return failure(error, updated); }
}

export async function saveSingleProductReconciliation(productUpdates: ReconciliationProductValues['productUpdates'], variationUpdates?: ReconciliationProductValues['variationUpdates']): Promise<{ success: boolean; error?: string }> {
  try {
    const values = reconciliationProductFormSchema.parse({ productUpdates, variationUpdates });
    const product = values.productUpdates;
    const payload: Record<string, unknown> = {};
    if (product.mainSupplierId !== undefined) { payload.main_supplier_id = product.mainSupplierId; payload.supplier_id = product.mainSupplierId; }
    if (product.categoryId !== undefined) {
      const { error: deleteError } = await supabase.from('product_categories').delete().eq('product_id', product.id);
      if (deleteError) throw deleteError;
      const { error: insertError } = await supabase.from('product_categories').insert([{ product_id: product.id, category_id: product.categoryId }]);
      if (insertError) throw insertError;
      payload.category_id = product.categoryId;
    }
    if (product.price !== undefined) payload.price = product.price;
    if (product.ncm !== undefined) {
      const { data: current, error } = await supabase.from('products').select('fiscal').eq('id', product.id).single();
      if (error) throw error;
      if (!current || (current.fiscal != null && (typeof current.fiscal !== 'object' || Array.isArray(current.fiscal)))) throw new Error('Os dados fiscais atuais precisam de revisão antes de alterar o NCM.');
      payload.fiscal = { ...(current.fiscal || {}), ncm: product.ncm };
    }
    if (Object.keys(payload).length) confirmedRows(await supabase.from('products').update(payload).eq('id', product.id).select('id'));
    for (const variation of values.variationUpdates) {
      const update: Record<string, unknown> = {};
      if (variation.price !== undefined) update.price = variation.price;
      if (variation.attributes !== undefined) update.attributes = variation.attributes;
      if (Object.keys(update).length) confirmedRows(await supabase.from('product_variations').update(update).eq('id', variation.id).eq('product_id', product.id).select('id'));
    }
    return { success: true };
  } catch (error) { return failure(error); }
}
