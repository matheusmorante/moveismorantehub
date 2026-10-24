import {
  buildMetaCatalogItems,
  type MetaCatalogOpportunitySource,
  type MetaCatalogProductSource,
  type MetaCatalogVariationSource,
} from '../../../../../shared-utils/metaCatalogPayload';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { supabase } from '../../../services/supabaseClient';
import {
  syncMobileMetaCatalogItems,
  type MobileMetaCatalogSyncResult,
} from './mobileProductMetaCatalogSyncService';

const PAGE_SIZE = 500;
const DATA_TIMEOUT_MS = 15_000;
const OPPORTUNITY_ID_BATCH_SIZE = 200;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Erro ao carregar os dados para sincronização do Catálogo Meta.';
};

interface QueryPageResponse {
  data: readonly unknown[] | null;
  error: unknown | null;
}

type QueryPage = (from: number, to: number) => PromiseLike<QueryPageResponse>;

async function fetchAllPages<T>(
  loadPage: QueryPage,
  timeoutLabel: string,
  entityLabel: string
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await withTimeout(
      Promise.resolve(loadPage(from, from + PAGE_SIZE - 1)),
      DATA_TIMEOUT_MS,
      null,
      `${timeoutLabel}:${from}`
    );
    if (!result) throw new Error(`A consulta de ${entityLabel} excedeu o tempo limite.`);
    if (result.error) throw result.error;

    const pageRows = result.data ?? [];
    rows.push(...(pageRows as T[]));
    if (pageRows.length < PAGE_SIZE) return rows;
  }
}

async function fetchOpportunities(
  products: readonly MetaCatalogProductSource[]
): Promise<MetaCatalogOpportunitySource[]> {
  const opportunityIds = Array.from(
    new Set(
      products
        .map((product) => product.opportunity_id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const opportunities: MetaCatalogOpportunitySource[] = [];

  for (let offset = 0; offset < opportunityIds.length; offset += OPPORTUNITY_ID_BATCH_SIZE) {
    const ids = opportunityIds.slice(offset, offset + OPPORTUNITY_ID_BATCH_SIZE);
    try {
      const result = await withTimeout(
        Promise.resolve(
          supabase
            .from('opportunities')
            .select('id, name, observations')
            .in('id', ids)
        ),
        DATA_TIMEOUT_MS,
        null,
        `mobile:meta-catalog-opportunities:${offset}`
      );
      if (!result || result.error) {
        opportunities.length = 0;
        console.warn(
          '[MetaCatalogSync] Não foi possível carregar os avisos de oportunidade; a sincronização seguirá sem eles.'
        );
        return opportunities;
      }
      opportunities.push(...((result.data ?? []) as MetaCatalogOpportunitySource[]));
    } catch {
      opportunities.length = 0;
      console.warn(
        '[MetaCatalogSync] Não foi possível carregar os avisos de oportunidade; a sincronização seguirá sem eles.'
      );
      return opportunities;
    }
  }

  return opportunities;
}

async function fetchMetaCatalogSyncSources(): Promise<{
  products: MetaCatalogProductSource[];
  variations: MetaCatalogVariationSource[];
  opportunities: MetaCatalogOpportunitySource[];
}> {
  const [products, variations] = await Promise.all([
    fetchAllPages<MetaCatalogProductSource>(
      (from, to) =>
        supabase
          .from('products')
          .select(
            'id, name, description, status, active, deleted, deleted_at, opportunity_id, unit_price, price, promo_price, stock, images, brand, code, is_draft, slug, is_salvado, product_kind, material, condition, product_categories(categories(name, type))'
          )
          .order('id', { ascending: true })
          .range(from, to),
      'mobile:meta-catalog-products',
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
      'mobile:meta-catalog-variations',
      'variações'
    ),
  ]);

  // O ERP também não bloqueia a sincronização do catálogo se esta leitura falhar.
  const opportunities = await fetchOpportunities(products);
  return { products, variations, opportunities };
}

/**
 * Sincroniza o catálogo inteiro pela ação administrativa do ERP.
 * Só replica o gate visual de administrador; a escrita permanece no proxy autenticado.
 */
export async function syncMobileMetaCatalog(
  isAdministrator: boolean,
  onProgress?: (processed: number, total: number) => void
): Promise<MobileMetaCatalogSyncResult> {
  if (!isAdministrator) {
    return {
      success: false,
      count: 0,
      error: 'Apenas administradores podem iniciar a sincronização via Graph API.',
    };
  }

  try {
    onProgress?.(0, 0);
    const { products, variations, opportunities } = await fetchMetaCatalogSyncSources();
    const items = buildMetaCatalogItems(products, variations, opportunities);
    return await syncMobileMetaCatalogItems(items, onProgress);
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: getErrorMessage(error),
    };
  }
}
