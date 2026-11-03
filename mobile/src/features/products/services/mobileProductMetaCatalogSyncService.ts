import { isTestProduct } from '../../../../../shared-utils/isTestProduct';
import {
  buildMetaCatalogBatchPayload,
  isMetaCatalogBatchDeletion,
  META_CATALOG_BATCH_LIMIT,
} from '../../../../../shared-utils/metaCatalogBatchPayload';
import type { MetaCatalogBatchSource } from '../../../../../shared-utils/metaCatalogBatchPayload';
import type {
  MetaCatalogOpportunitySource,
  MetaCatalogProductSource,
  MetaCatalogVariationSource,
} from '../../../../../shared-utils/metaCatalogPayload';
import {
  buildProductMetaCatalogSyncItems,
  excludeMetaCatalogDeleteCollisions,
} from '../../../../../shared-utils/productMetaCatalogSyncItems';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { waitForMetaCatalogBatchHandles } from '../../../../../shared-utils/metaCatalogBatchStatus';
import { getAppSettings } from '../../../services/appSettingsCache';
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
    (process.env.NODE_ENV === 'production' ? 'https://morantehub.vercel.app' : '');
  return apiBase ? `${apiBase.replace(/\/+$/, '')}/api/meta-graph` : null;
};

const getErrorMessage = (value: unknown): string => {
  if (value instanceof Error && value.name === 'AbortError') {
    return 'A solicitação à Meta excedeu o tempo limite. Confira o catálogo antes de tentar novamente.';
  }
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Erro ao sincronizar o catálogo da Meta.';
};

async function getMetaProxyContext(): Promise<{ proxyUrl: string; accessToken: string }> {
  const proxyUrl = getMetaProxyUrl();
  if (!proxyUrl) throw new Error('EXPO_PUBLIC_ERP_API_URL não configurada neste ambiente.');

  const sessionResult = await withTimeout(
    supabase.auth.getSession(),
    SESSION_TIMEOUT_MS,
    { data: { session: null }, error: null },
    'mobile:meta-catalog-session'
  );
  const accessToken = sessionResult.data.session?.access_token;
  if (sessionResult.error || !accessToken) throw new Error('Sessão inválida. Entre novamente.');

  return { proxyUrl, accessToken };
}

const postCatalogBatch = async (
  proxyUrl: string,
  accessToken: string,
  payload: ReturnType<typeof buildMetaCatalogBatchPayload>
): Promise<string[]> => {
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
    const handles =
      result && typeof result === 'object' && 'handles' in result
        ? (result as { handles?: unknown }).handles
        : undefined;
    return Array.isArray(handles)
      ? handles.filter((handle): handle is string => typeof handle === 'string' && Boolean(handle.trim()))
      : [];
  } finally {
    clearTimeout(timeout);
  }
};

const checkCatalogBatchStatus = async (
  proxyUrl: string,
  accessToken: string,
  handle: string
): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation: 'check_catalog_batch', handle }),
      signal: controller.signal,
    });
    const result: unknown = await response.json().catch(() => null);
    const error =
      result && typeof result === 'object' && 'error' in result
        ? (result as { error?: unknown }).error
        : undefined;
    if (!response.ok || error) throw new Error(getErrorMessage(error));
    return result;
  } finally {
    clearTimeout(timeout);
  }
};

async function postMetaCatalogItems(
  proxyUrl: string,
  accessToken: string,
  items: readonly MetaCatalogBatchSource[],
  onProgress?: (processed: number, total: number) => void
): Promise<number> {
  const total = items.length;
  let processed = 0;
  onProgress?.(processed, total);

  const includesDescriptions = items.some((item) => !isMetaCatalogBatchDeletion(item));
  let whatsappBaseDescription: string | undefined;
  if (includesDescriptions) {
    const settingsTimeout = { timedOut: true } as const;
    const settings = await withTimeout(
      getAppSettings({ forceRefresh: true }),
      DATA_TIMEOUT_MS,
      settingsTimeout,
      'mobile:meta-catalog-settings'
    );
    if (settings === settingsTimeout) {
      throw new Error('A leitura das configurações da descrição Meta excedeu o tempo limite.');
    }
    const configuredDescription = settings?.channelBaseDescriptions?.whatsapp;
    whatsappBaseDescription =
      typeof configuredDescription === 'string' ? configuredDescription : undefined;
  }

  for (let offset = 0; offset < total; offset += META_CATALOG_BATCH_LIMIT) {
    const payload = buildMetaCatalogBatchPayload(
      items.slice(offset, offset + META_CATALOG_BATCH_LIMIT),
      whatsappBaseDescription
    );
    const handles = await postCatalogBatch(proxyUrl, accessToken, payload);
    await waitForMetaCatalogBatchHandles(handles, (handle) =>
      checkCatalogBatchStatus(proxyUrl, accessToken, handle)
    );
    processed += payload.requests.length;
    onProgress?.(processed, total);
  }

  return processed;
}

/** Envia os itens já preparados para o proxy Meta em lotes e expõe progresso por lote confirmado. */
export async function syncMobileMetaCatalogItems(
  items: readonly MetaCatalogBatchSource[],
  onProgress?: (processed: number, total: number) => void
): Promise<MobileMetaCatalogSyncResult> {
  try {
    const { proxyUrl, accessToken } = await getMetaProxyContext();
    const count = await postMetaCatalogItems(proxyUrl, accessToken, items, onProgress);
    return { success: true, count };
  } catch (error) {
    return { success: false, count: 0, error: getErrorMessage(error) };
  }
}

/** Sincroniza pai e variações com as mesmas regras do ERP, pelo proxy autenticado. */
export async function syncMobileProductToMetaCatalog(
  productId: string
): Promise<MobileMetaCatalogSyncResult> {
  try {
    if (!productId) return { success: false, count: 0, error: 'ID do produto ausente.' };

    const { proxyUrl, accessToken } = await getMetaProxyContext();

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
    const candidateCodes = Array.from(
      new Set(items.filter((item) => 'deleted' in item && item.deleted === true).map((item) => item.code))
    );
    let protectedCodes = new Set<string>();
    if (candidateCodes.length > 0) {
      const collisionResults = await withTimeout(
        Promise.all([
          supabase.from('products').select('id, code').in('code', candidateCodes),
          supabase
            .from('product_variations')
            .select('id, product_id, sku')
            .in('sku', candidateCodes),
        ]),
        DATA_TIMEOUT_MS,
        null,
        'mobile:meta-catalog-delete-collision-check'
      );
      if (!collisionResults) {
        throw new Error('A verificação de identificadores do catálogo excedeu o tempo limite.');
      }
      const [productCodeResult, variationSkuResult] = collisionResults;
      if (productCodeResult.error) throw productCodeResult.error;
      if (variationSkuResult.error) throw variationSkuResult.error;

      protectedCodes = new Set<string>([
        ...((productCodeResult.data || []) as Array<{ id: string; code: string | null }>)
          .filter((row) => row.id !== productId)
          .map((row) => String(row.code || '').trim()),
        ...((variationSkuResult.data || []) as Array<{ id: string; product_id: string; sku: string | null }>)
          .filter((row) => row.product_id !== productId)
          .map((row) => String(row.sku || '').trim()),
      ]);
    }
    const safeItems = excludeMetaCatalogDeleteCollisions(items, protectedCodes);
    if (safeItems.length !== items.length) {
      throw new Error(
        'A sincronização foi bloqueada para não remover um identificador do catálogo que pertence a outro produto.'
      );
    }
    const count = await postMetaCatalogItems(proxyUrl, accessToken, safeItems);
    return { success: true, count };
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
