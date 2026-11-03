import { buildPostgrestAccentInsensitiveOrFilter } from '../../../../../shared-utils/searchText';
import { supabase } from '../../../services/supabaseClient';

export interface MobileCanonicalVariation {
  id: string;
  name: string;
  sku?: string | null;
  product?: {
    name?: string | null;
    description?: string | null;
  } | null;
}

export const searchMobileCanonicalVariations = async (
  term: string,
  sourceId: string,
  supplierId?: string
): Promise<MobileCanonicalVariation[]> => {
  const safeTerm = term
    .trim()
    .replace(/[%(),]/g, ' ')
    .replace(/"/g, '""');
  if (safeTerm.length < 2) return [];

  let query = supabase
    .from('product_variations')
    .select('id, name, sku, product:products!inner(name, description, supplier_id)')
    .neq('id', sourceId)
    .is('merged_to_variation_id', null)
    .or(buildPostgrestAccentInsensitiveOrFilter(['name', 'sku'], safeTerm));
  if (supplierId) query = query.eq('products.supplier_id', supplierId);

  const { data, error } = await query.limit(12);
  if (error) throw new Error('Não foi possível buscar variações.');
  return (data || []) as unknown as MobileCanonicalVariation[];
};
