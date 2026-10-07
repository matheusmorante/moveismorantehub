import { supabase } from '@/pages/utils/supabaseConfig';
import {
  calculateVariationCatalogStats,
  type VariationCatalogStats,
} from '../utils/catalog/registeredVariationCount';

/** Loads the product data used by the catalog summary and applies its domain calculation. */
export const loadProductCatalogStats = async (): Promise<VariationCatalogStats> => {
  const { data, error } = await supabase
    .from('products')
    .select('id, status, active, is_draft, deleted, product_variations(id, sku, status, active)')
    .eq('deleted', false);

  if (error) {
    throw error;
  }

  return calculateVariationCatalogStats(data ?? []);
};
