import { supabase } from '@/pages/utils/supabaseConfig';
import {
  type MetaCatalogOpportunitySource,
  type MetaCatalogProductSource,
  type MetaCatalogVariationSource,
} from './metaCatalogPayload';
import { calculateMetaCatalogStats, type MetaCatalogStats } from './metaCatalogStats';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

const META_SYNC_PAGE_SIZE = 500;
const META_SYNC_QUERY_TIMEOUT_MS = 15_000;

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

export const fetchMetaCatalogStats = async (): Promise<MetaCatalogStats> => {
  const [{ data: products, error: productsError }, { data: variations, error: variationsError }] =
    await Promise.all([
      supabase.from('products').select('id, status, deleted, deleted_at'),
      supabase.from('product_variations').select('id, product_id, status'),
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
  const [products, variations, opportunityResult] = await Promise.all([
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
  ]);

  return {
    products,
    variations,
    opportunities: (opportunityResult?.data ?? []) as MetaCatalogOpportunitySource[],
  };
};
