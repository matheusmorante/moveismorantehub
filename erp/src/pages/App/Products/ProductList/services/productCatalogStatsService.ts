import { supabase } from '@/pages/utils/supabaseConfig';
import {
  calculateVariationCatalogStats,
  type VariationCatalogStats,
} from '../utils/catalog/registeredVariationCount';
import { NON_TEST_PRODUCT_ARTIFACT_FILTER } from '../../../../../../../shared-utils/testArtifactQueries';

export interface LoadProductCatalogStatsOptions {
  readonly showTestProducts?: boolean;
  readonly mode?: 'standard' | 'composition';
}

let cachedStats: {
  [cacheKey: string]: { data: VariationCatalogStats; timestamp: number };
} = {};

let inFlightStats: {
  [cacheKey: string]: Promise<VariationCatalogStats> | null;
} = {};

const STATS_CACHE_TTL_MS = 30 * 1000; // 30 segundos de cache

export const invalidateProductCatalogStatsCache = () => {
  cachedStats = {};
  inFlightStats = {};
};

/** Loads the product data used by the catalog summary and applies its domain calculation. */
export const loadProductCatalogStats = async (
  options?: LoadProductCatalogStatsOptions & { forceRefresh?: boolean }
): Promise<VariationCatalogStats> => {
  const cacheKey = JSON.stringify({
    showTestProducts: options?.showTestProducts,
    mode: options?.mode,
  });

  const now = Date.now();
  if (!options?.forceRefresh) {
    const cached = cachedStats[cacheKey];
    if (cached && now - cached.timestamp < STATS_CACHE_TTL_MS) {
      return cached.data;
    }
    if (inFlightStats[cacheKey]) {
      return inFlightStats[cacheKey]!;
    }
  }

  const fetchPromise = (async () => {
    try {
      let query: any = supabase
        .from('products')
        .select(
          'id, status, active, is_draft, deleted, product_variations(id, sku, status, active)'
        )
        .eq('deleted', false);

      if (options?.mode === 'composition' && typeof query.eq === 'function') {
        query = query.eq('item_type', 'composition');
      }

      if (options?.showTestProducts === false && typeof query.or === 'function') {
        query = query.or(NON_TEST_PRODUCT_ARTIFACT_FILTER);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const stats = calculateVariationCatalogStats(data ?? []);
      cachedStats[cacheKey] = { data: stats, timestamp: Date.now() };
      return stats;
    } finally {
      inFlightStats[cacheKey] = null;
    }
  })();

  inFlightStats[cacheKey] = fetchPromise;
  return fetchPromise;
};
