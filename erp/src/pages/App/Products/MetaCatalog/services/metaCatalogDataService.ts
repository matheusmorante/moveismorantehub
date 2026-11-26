import { supabase } from '@/pages/utils/supabaseConfig';
import type { MetaCatalogStats } from './metaCatalogStats';
import { withTimeout } from '../../../../../../../shared-utils/core/withTimeout';

const META_SYNC_PAGE_SIZE = 500;
const META_SYNC_QUERY_TIMEOUT_MS = 15_000;
let metaCatalogStatsRequest: Promise<MetaCatalogStats> | null = null;

interface QueryPageResponse {
  data: readonly unknown[] | null;
  error: unknown | null;
}

type QueryPage = (from: number, to: number) => PromiseLike<QueryPageResponse>;

async function fetchAllPages<T>(
  loadPage: QueryPage,
  entityLabel: string
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += META_SYNC_PAGE_SIZE) {
    const result = await withTimeout(
      Promise.resolve(loadPage(from, from + META_SYNC_PAGE_SIZE - 1)),
      META_SYNC_QUERY_TIMEOUT_MS,
      null,
      `erp:meta-catalog-${entityLabel}:${from}`
    );
    if (!result) throw new Error(`A consulta de ${entityLabel} excedeu o tempo limite.`);
    if (result.error) throw result.error;

    const pageRows = result.data ?? [];
    rows.push(...(pageRows as T[]));
    if (pageRows.length < META_SYNC_PAGE_SIZE) return rows;
  }
}

export const fetchMetaCatalogStats = (): Promise<MetaCatalogStats> => {
  if (!metaCatalogStatsRequest) {
    metaCatalogStatsRequest = withTimeout(
      Promise.resolve(supabase.rpc('get_meta_catalog_stats')),
      META_SYNC_QUERY_TIMEOUT_MS,
      null,
      'erp:meta-catalog-stats'
    )
      .then((result) => {
        if (!result) throw new Error('A consulta das estatísticas do catálogo excedeu o tempo limite.');
        if (result.error) throw result.error;

        const row = Array.isArray(result.data) ? result.data[0] : result.data;
        if (!row || typeof row !== 'object') {
          throw new Error('A resposta das estatísticas do catálogo está vazia.');
        }

        const stats = row as Record<string, unknown>;
        return {
          publishedSimple: Number(stats.published_simple ?? 0),
          publishedVariations: Number(stats.published_variations ?? 0),
          notPublished: Number(stats.not_published ?? 0),
        };
      })
      .finally(() => {
        metaCatalogStatsRequest = null;
      });
  }

  return metaCatalogStatsRequest;
};

interface ActiveCampaignLabelRow {
  product_id: string;
  variation_id: string | null;
  promotion_name: string | null;
}

/** O envio pontual lê apenas as campanhas vigentes dos produtos que está sincronizando. */
export async function fetchActiveCampaignLabelIndex(productIds: readonly string[]) {
  const ids = Array.from(new Set(productIds.map((id) => id.trim()).filter(Boolean)));
  const productNames = new Map<string, string[]>();
  const variationNames = new Map<string, string[]>();
  if (!ids.length) return { productNames, variationNames };

  const rows = await fetchAllPages<ActiveCampaignLabelRow>((from, to) => supabase
    .from('active_campaign_prices').select('product_id, variation_id, promotion_name').in('product_id', ids)
    .order('product_id').order('variation_id', { nullsFirst: true }).order('promotion_name').range(from, to), 'campanhas-ativas');
  for (const row of rows) {
    const name = row.promotion_name?.trim();
    if (!name) continue;
    const index = row.variation_id ? variationNames : productNames;
    const id = row.variation_id ?? row.product_id;
    const names = index.get(id) ?? [];
    if (!names.includes(name)) index.set(id, [...names, name]);
  }
  return { productNames, variationNames };
}
