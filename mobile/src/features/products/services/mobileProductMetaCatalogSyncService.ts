import { isTestProduct } from '../../../../../shared-utils/isTestProduct';
import {
  buildMetaCatalogBatchPayload,
  META_CATALOG_BATCH_LIMIT,
} from '../../../../../shared-utils/metaCatalogBatchPayload';
import type {
  MetaCatalogOpportunitySource,
  MetaCatalogProductSource,
  MetaCatalogVariationSource,
} from '../../../../../shared-utils/metaCatalogPayload';
import { buildProductMetaCatalogSyncItems } from '../../../../../shared-utils/productMetaCatalogSyncItems';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { supabase } from '../../../services/supabaseClient';

const SYNC_DEBOUNCE_MS = 400;
const SESSION_TIMEOUT_MS = 10_000;
const DATA_TIMEOUT_MS = 15_000;
const API_TIMEOUT_MS = 20_000;
const pendingSyncs = new Map<string, ReturnType<typeof setTimeout>>();

export interface MobileMetaCatalogSyncResult {
  success: boolean;
  count: number;
  error?: string;
}

const getMetaProxyUrl = (): string | null => {
  const configuredBase = process.env.EXPO_PUBLIC_ERP_API_URL?.trim();
  const apiBase =
    configuredBase ||
    (process.env.NODE_ENV === 'production' ? 'https://morantehub.com' : '');
  return apiBase ? `${apiBase.replace(/\/+$/, '')}/api/meta-graph` : null;
};

const getErrorMessage = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Erro ao sincronizar o catálogo da Meta.';
};

const postCatalogBatch = async (
  proxyUrl: string,
  accessToken: string,
  payload: ReturnType<typeof buildMetaCatalogBatchPayload>
): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation: 'sync_catalog_batch', payload }),
      signal: controller.signal,
    });

    const result: unknown = await response.json().catch(() => null);
    const error =
      result && typeof result === 'object' && 'error' in result
        ? (result as { error?: unknown }).error
        : undefined;
    if (!response.ok || error) throw new Error(getErrorMessage(error));
  } finally {
    clearTimeout(timeout);
  }
};

/** Sincroniza pai e variações com as mesmas regras do ERP, pelo proxy autenticado. */
export async function syncMobileProductToMetaCatalog(
  productId: string
): Promise<MobileMetaCatalogSyncResult> {
  try {
    if (!productId) return { success: false, count: 0, error: 'ID do produto ausente.' };

    const proxyUrl = getMetaProxyUrl();
    if (!proxyUrl) {
      return {
        success: false,
        count: 0,
        error: 'EXPO_PUBLIC_ERP_API_URL não configurada neste ambiente.',
      };
    }

    const sessionResult = await withTimeout(
      supabase.auth.getSession(),
      SESSION_TIMEOUT_MS,
      { data: { session: null }, error: null },
      'mobile:meta-catalog-session'
    );
    const accessToken = sessionResult.data.session?.access_token;
    if (sessionResult.error || !accessToken) {
      return { success: false, count: 0, error: 'Sessão inválida. Entre novamente.' };
    }

    const sources = await withTimeout(
      Promise.all([
        supabase
          .from('products')
          .select(
            'id, name, description, status, active, deleted, deleted_at, opportunity_id, unit_price, price, promo_price, stock, images, brand, code, is_draft, slug, is_salvado, product_kind, material, condition, product_categories(categories(name, type))'
          )
          .eq('id', productId)
          .maybeSingle(),
        supabase
          .from('product_variations')
          .select(
            'id, product_id, status, active, name, sku, image_url, price, promo_price, stock, attributes, description, use_parent_price, use_parent_promo_price, use_parent_name, use_parent_description'
          )
          .eq('product_id', productId),
      ]),
      DATA_TIMEOUT_MS,
      null,
      'mobile:meta-catalog-product-data'
    );
    if (!sources) throw new Error('A consulta do produto excedeu o tempo limite.');

    const [productResult, variationResult] = sources;
    if (productResult.error) throw productResult.error;
    if (variationResult.error) throw variationResult.error;
    const product = productResult.data as MetaCatalogProductSource | null;
    if (!product) return { success: false, count: 0, error: 'Produto não encontrado.' };
    if (isTestProduct(product)) return { success: true, count: 0 };

    let opportunities: MetaCatalogOpportunitySource[] = [];
    if (product.opportunity_id) {
      const opportunityResult = await withTimeout(
        supabase
          .from('opportunities')
          .select('id, name, observations')
          .eq('id', product.opportunity_id),
        DATA_TIMEOUT_MS,
        null,
        'mobile:meta-catalog-opportunity-data'
      );
      if (!opportunityResult) throw new Error('A consulta da oportunidade excedeu o tempo limite.');
      if (opportunityResult.error) throw opportunityResult.error;
      opportunities = (opportunityResult.data || []) as MetaCatalogOpportunitySource[];
    }

    const items = buildProductMetaCatalogSyncItems(
      product,
      (variationResult.data || []) as MetaCatalogVariationSource[],
      opportunities
    );
    for (let offset = 0; offset < items.length; offset += META_CATALOG_BATCH_LIMIT) {
      const payload = buildMetaCatalogBatchPayload(
        items.slice(offset, offset + META_CATALOG_BATCH_LIMIT)
      );
      await postCatalogBatch(proxyUrl, accessToken, payload);
    }

    return { success: true, count: items.length };
  } catch (error) {
    return { success: false, count: 0, error: getErrorMessage(error) };
  }
}

/** Agenda a sincronização após persistir sem atrasar a ação do operador. */
export function triggerMobileProductMetaCatalogSync(productId: string): void {
  if (!productId) return;

  const existing = pendingSyncs.get(productId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingSyncs.delete(productId);
    void syncMobileProductToMetaCatalog(productId).then((result) => {
      if (!result.success) {
        console.warn(`[MetaCatalogSync] Falha ao sincronizar produto ${productId}:`, result.error);
      } else if (result.count > 0) {
        console.log(
          `[MetaCatalogSync] Produto ${productId} sincronizado automaticamente com a Meta (${result.count} itens).`
        );
      }
    });
  }, SYNC_DEBOUNCE_MS);

  pendingSyncs.set(productId, timer);
}
