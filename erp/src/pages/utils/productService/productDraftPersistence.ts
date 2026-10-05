import type Product from '../../types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { mapToDB } from './productToDbMapper';
import { resolveUniqueSlug } from '../uniqueSlug';
import { createProductDraftSnapshot, isProductDraft } from './productDraftSnapshot';

/** The draft is one aggregate: saving never creates inventory or partial child records. */
export async function persistProductDraft(product: Product): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('products')
    .select('id, updated_at, is_draft, status, technical_specs')
    .eq('id', product.id!)
    .maybeSingle();
  if (readError) throw readError;
  if (existing && !isProductDraft({ isDraft: existing.is_draft, status: existing.status })) {
    throw new Error('O produto já foi concluído. Reabra o cadastro antes de continuar.');
  }

  const snapshot = createProductDraftSnapshot(product);
  const payload = mapToDB(snapshot);
  for (const field of [
    'variations', 'brand', 'category', 'ecommerce_description', 'whatsapp_description',
    'whatsapp_template', 'ecommerce_template', 'initial_stock_entries', 'meta_title',
    'meta_description', 'seo_description', 'stock', 'initial_stock',
  ]) delete payload[field];
  payload.technical_specs = {
    ...(existing?.technical_specs || product.technicalSpecs || {}),
    ...payload.technical_specs,
    draftProduct: snapshot,
  };
  payload.updated_at = new Date().toISOString();
  payload.slug = await resolveUniqueSlug(supabase, 'products', payload.slug || payload.name, product.id);
  payload.category_id = product.categoryIds?.[0] || null;

  let response;
  if (existing) {
    const expectedVersion = product.updatedAt || existing.updated_at;
    let query = supabase.from('products').update(payload).eq('id', product.id!)
      .or('is_draft.eq.true,status.eq.draft');
    query = expectedVersion
      ? query.eq('updated_at', expectedVersion)
      : query.is('updated_at', null);
    response = await query.select('id, updated_at').maybeSingle();
  } else {
    response = await supabase.from('products').insert(payload).select('id, updated_at').single();
  }
  if (response.error) throw response.error;
  if (!response.data) {
    throw new Error('Este rascunho foi alterado em outro lugar. Reabra o produto para continuar.');
  }
  product.updatedAt = response.data.updated_at;
}
