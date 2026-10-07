import { supabase } from '@/pages/utils/supabaseConfig';
import {
  type MetaCatalogOpportunitySource,
  type MetaCatalogProductSource,
  type MetaCatalogVariationSource,
} from './metaCatalogPayload';
import { calculateMetaCatalogStats, type MetaCatalogStats } from './metaCatalogStats';

export const fetchMetaCatalogStats = async (): Promise<MetaCatalogStats> => {
  const [{ data: products, error: productsError }, { data: variations, error: variationsError }] =
    await Promise.all([
      supabase.from('products').select('id, status, active, deleted, deleted_at'),
      supabase.from('product_variations').select('id, product_id, status, active'),
    ]);

  if (productsError) throw productsError;
  if (variationsError) throw variationsError;

  return calculateMetaCatalogStats(products ?? [], variations ?? []);
};

export interface MetaCatalogSyncSources {
  readonly products: MetaCatalogProductSource[];
  readonly variations: MetaCatalogVariationSource[];
  readonly opportunities: MetaCatalogOpportunitySource[];
}

export const fetchMetaCatalogSyncSources = async (): Promise<MetaCatalogSyncSources> => {
  const [
    { data: products, error: productsError },
    { data: variations, error: variationsError },
    { data: opportunities },
  ] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, name, title, description, whatsapp_description, status, active, deleted, deleted_at, opportunity_id, sales_price, unit_price, price, stock, images, brand, group_name, sku, code'
      ),
    supabase
      .from('product_variations')
      .select(
        'id, product_id, status, active, name, color, size, sku, code, image_url, sales_price, price, stock'
      ),
    // Falha ao carregar observações de oportunidade não bloqueia a publicação do catálogo.
    supabase.from('opportunities').select('id, name, observations'),
  ]);

  if (productsError) throw productsError;
  if (variationsError) throw variationsError;

  return {
    products: (products ?? []) as MetaCatalogProductSource[],
    variations: (variations ?? []) as MetaCatalogVariationSource[],
    opportunities: (opportunities ?? []) as MetaCatalogOpportunitySource[],
  };
};
