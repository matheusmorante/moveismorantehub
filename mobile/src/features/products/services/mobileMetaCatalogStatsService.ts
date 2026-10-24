import { calculateMetaCatalogStats, type MetaCatalogStats } from '../../../../../shared-utils/metaCatalogStats';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { supabase } from '../../../services/supabaseClient';

const META_CATALOG_STATS_TIMEOUT_MS = 15_000;

/** Lê o resumo de publicação do catálogo sem executar sincronizações externas. */
export async function fetchMobileMetaCatalogStats(): Promise<MetaCatalogStats> {
  const result = await withTimeout(
    Promise.all([
      supabase
        .from('products')
        .select('id, status, active, deleted, deleted_at, is_salvado, product_kind'),
      supabase.from('product_variations').select('id, product_id, status, active'),
    ]),
    META_CATALOG_STATS_TIMEOUT_MS,
    null,
    'mobile:meta-catalog-stats'
  );

  if (!result) throw new Error('A consulta do resumo do Catálogo Meta excedeu o tempo limite.');

  const [productsResult, variationsResult] = result;
  if (productsResult.error) throw productsResult.error;
  if (variationsResult.error) throw variationsResult.error;

  return calculateMetaCatalogStats(productsResult.data ?? [], variationsResult.data ?? []);
}
