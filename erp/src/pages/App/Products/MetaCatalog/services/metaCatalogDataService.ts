import { supabase } from '@/pages/utils/supabaseConfig';
import {
  type MetaCatalogOpportunitySource,
  type MetaCatalogProductSource,
  type MetaCatalogVariationSource,
} from './metaCatalogPayload';
import type { MetaCatalogStats } from './metaCatalogStats';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';

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

export interface MetaCatalogSyncSources {
  readonly products: MetaCatalogProductSource[];
  readonly variations: MetaCatalogVariationSource[];
  readonly opportunities: MetaCatalogOpportunitySource[];
}

interface ActiveCampaignLabelRow {
  product_id: string;
  variation_id: string | null;
  promotion_name: string | null;
}

export interface ActiveCampaignLabelIndex {
  readonly productNames: ReadonlyMap<string, readonly string[]>;
  readonly variationNames: ReadonlyMap<string, readonly string[]>;
}

const addCampaignName = (index: Map<string, string[]>, key: string, name: string | null) => {
  const normalizedName = String(name || '').trim();
  if (!key || !normalizedName) return;
  const names = index.get(key) || [];
  if (!names.includes(normalizedName)) names.push(normalizedName);
  index.set(key, names);
};

/** Lê somente nomes e IDs das campanhas vigentes no banco; aceita filtro por produto para sincronizações pontuais. */
export const fetchActiveCampaignLabelIndex = async (
  productIds?: readonly string[]
): Promise<ActiveCampaignLabelIndex> => {
  const uniqueProductIds = productIds
    ? Array.from(new Set(productIds.map((id) => String(id || '').trim()).filter(Boolean)))
    : null;
  const emptyIndex = { productNames: new Map(), variationNames: new Map() };
  if (uniqueProductIds && uniqueProductIds.length === 0) return emptyIndex;

  const campaignRows = await fetchAllPages<ActiveCampaignLabelRow>(
    (from, to) => {
      let query = supabase
        .from('active_campaign_prices')
        .select('product_id, variation_id, promotion_name')
        .order('product_id', { ascending: true })
        .order('variation_id', { ascending: true, nullsFirst: true })
        .order('promotion_name', { ascending: true });
      if (uniqueProductIds) query = query.in('product_id', uniqueProductIds);
      return query.range(from, to);
    },
    'campanhas-ativas'
  );

  const productNames = new Map<string, string[]>();
  const variationNames = new Map<string, string[]>();
  campaignRows.forEach((campaign) => {
    if (campaign.variation_id) {
      addCampaignName(variationNames, campaign.variation_id, campaign.promotion_name);
    } else {
      addCampaignName(productNames, campaign.product_id, campaign.promotion_name);
    }
  });

  return { productNames, variationNames };
};

export const fetchMetaCatalogSyncSources = async (): Promise<MetaCatalogSyncSources> => {
  const [products, variations, opportunityResult, activeCampaignLabels] = await Promise.all([
    fetchAllPages<MetaCatalogProductSource>(
      (from, to) =>
        supabase
          .from('products')
          .select(
            'id, name, description, status, active, deleted, deleted_at, opportunity_id, unit_price, price, promo_price, stock, images, brand, code, is_draft, slug, is_salvado, product_kind, material, condition, product_categories(categories(name, type))'
          )
          .order('id', { ascending: true })
          .range(from, to),
      'produtos'
    ),
    fetchAllPages<MetaCatalogVariationSource>(
      (from, to) =>
        supabase
          .from('product_variations')
          .select(
            'id, product_id, status, active, name, sku, image_url, price, promo_price, stock, attributes, description, use_parent_price, use_parent_promo_price, use_parent_name, use_parent_description'
          )
          .order('id', { ascending: true })
          .range(from, to),
      'variações'
    ),
    // Falha ou demora ao carregar observações não bloqueia a reconciliação do catálogo.
    withTimeout(
      Promise.resolve(supabase.from('opportunities').select('id, name, observations')),
      META_SYNC_QUERY_TIMEOUT_MS,
      null,
      'erp:meta-catalog-opportunities'
    ).catch((error) => {
      console.warn(
        '[MetaCatalogSync] Não foi possível carregar os avisos de oportunidade; a sincronização seguirá sem eles.',
        error
      );
      return null;
    }),
    fetchActiveCampaignLabelIndex(),
  ]);

  return {
    products: products.map((product) => ({
      ...product,
      activeCampaignNames: activeCampaignLabels.productNames.get(product.id) || [],
    })),
    variations: variations.map((variation) => ({
      ...variation,
      activeCampaignNames: activeCampaignLabels.variationNames.get(variation.id) || [],
    })),
    opportunities: (opportunityResult?.data ?? []) as MetaCatalogOpportunitySource[],
  };
};
