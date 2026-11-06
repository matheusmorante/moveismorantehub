import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings } from '@/pages/utils/settingsService';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { isTestProduct } from '../hmlTestData';
import {
  fetchActiveCampaignLabelIndex,
  fetchMetaCatalogSyncSources,
  type MetaCatalogSyncSources,
} from '@/pages/App/Products/MetaCatalog/services/metaCatalogDataService';
import type {
  MetaCatalogOpportunitySource,
  MetaCatalogProductSource,
  MetaCatalogVariationSource,
} from '../../../../../shared-utils/metaCatalogPayload';
import {
  buildMetaCatalogSyncItems,
  buildProductMetaCatalogSyncItems,
  excludeMetaCatalogDeleteCollisions,
} from '../../../../../shared-utils/productMetaCatalogSyncItems';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

const DATA_TIMEOUT_MS = 15_000;

/**
 * Cache de temporizadores para debounce por productId,
 * evitando disparos múltiplos durante mutações sequenciais.
 */
const pendingSyncs = new Map<string, ReturnType<typeof setTimeout>>();

let cachedOpportunities: { timestamp: number; data: MetaCatalogOpportunitySource[] } | null = null;
const OPP_CACHE_TTL_MS = 5 * 60 * 1000;

export function clearMetaCatalogOpportunitiesCache(): void {
  cachedOpportunities = null;
}

async function fetchCachedOpportunities(): Promise<{ data: MetaCatalogOpportunitySource[] | null; error: any }> {
  const now = Date.now();
  if (cachedOpportunities && now - cachedOpportunities.timestamp < OPP_CACHE_TTL_MS) {
    return { data: cachedOpportunities.data, error: null };
  }
  const result = await supabase.from('opportunities').select('id, name, observations');
  if (!result.error && result.data) {
    cachedOpportunities = { timestamp: now, data: result.data as MetaCatalogOpportunitySource[] };
  }
  return result;
}

/**
 * Executa a sincronização de todos os produtos do sistema com a Meta Catalog API.
 * Usado pelo botão manual nos 3 pontinhos e na tela de Catálogo Meta.
 */
export async function syncAllProductsToMetaCatalog(
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; count: number; handles?: string[] }> {
  const { whatsappConfig } = getSettings();
  if (!whatsappConfig?.catalogId) {
    throw new Error('Credenciais da Meta não configuradas no sistema (Configurações > WhatsApp/Meta).');
  }

  const { products, variations, opportunities } = await fetchMetaCatalogSyncSources();
  const allItems = buildMetaCatalogSyncItems(products, variations, opportunities);

  const result = await whatsappGraphService.syncBatchProductsToCatalog(allItems, onProgress);
  return result;
}

/**
 * Sincroniza um produto individual (e suas variações) com a Meta Catalog API.
 * Se o produto ou variação estiver oculto/desativado/deletado, envia comando DELETE para a Meta.
 * Se estiver ativo e publicado, envia comando UPDATE com dados cadastrais e de preço.
 */
export async function syncProductToMetaCatalog(
  productId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { whatsappConfig } = getSettings();
    if (!whatsappConfig?.catalogId) {
      return { success: false, count: 0, error: 'Credenciais da Meta não configuradas.' };
    }

    if (!productId) return { success: false, count: 0, error: 'ID do produto ausente.' };

    // Buscar produto e suas variações no banco
    const [
      { data: product, error: prodErr },
      { data: variations, error: varErr },
      { data: opportunities },
      activeCampaignLabels,
    ] = await Promise.all([
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
      fetchCachedOpportunities(),
      fetchActiveCampaignLabelIndex([productId]),
    ]);

    if (prodErr || !product) {
      return { success: false, count: 0, error: prodErr?.message || 'Produto não encontrado.' };
    }

    if (isTestProduct(product)) {
      return { success: true, count: 0 };
    }

    const varList = ((variations || []) as MetaCatalogVariationSource[]).map((variation) => ({
      ...variation,
      activeCampaignNames: activeCampaignLabels.variationNames.get(variation.id) || [],
    }));
    const itemsToSend = buildProductMetaCatalogSyncItems(
      {
        ...(product as MetaCatalogProductSource),
        activeCampaignNames: activeCampaignLabels.productNames.get(productId) || [],
      },
      varList,
      (opportunities || []) as MetaCatalogOpportunitySource[]
    );
    if (itemsToSend.length === 0) return { success: true, count: 0 };

    const candidateCodes = Array.from(
      new Set(
        itemsToSend
          .filter((item) => 'deleted' in item && item.deleted === true)
          .map((item) => item.code)
      )
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
        'erp:meta-catalog-delete-collision-check'
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
    const safeItemsToSend = excludeMetaCatalogDeleteCollisions(itemsToSend, protectedCodes);
    if (safeItemsToSend.length !== itemsToSend.length) {
      throw new Error(
        'A sincronização foi bloqueada para não remover um identificador do catálogo que pertence a outro produto.'
      );
    }

    const result = await whatsappGraphService.syncBatchProductsToCatalog(safeItemsToSend);
    return { success: result.success, count: result.success ? safeItemsToSend.length : 0 };
  } catch (err: any) {
    console.warn(`[MetaCatalogSync] Falha ao sincronizar produto ${productId}:`, err);
    return { success: false, count: 0, error: err.message };
  }
}

/**
 * Dispara a sincronização de um produto com a Meta em segundo plano,
 * com debounce de 400ms para agregar mutações sequenciais.
 */
export function triggerProductMetaCatalogSync(productId: string): void {
  if (!productId) return;

  const existing = pendingSyncs.get(productId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingSyncs.delete(productId);
    void syncProductToMetaCatalog(productId).then((res) => {
      if (res.success && res.count > 0) {
        console.log(`[MetaCatalogSync] Produto ${productId} sincronizado automaticamente com a Meta (${res.count} itens).`);
      } else if (!res.success) {
        console.warn(`[MetaCatalogSync] Falha ao sincronizar produto ${productId}:`, res.error);
      }
    }).catch((err) => {
      console.warn(`[MetaCatalogSync] Erro no background sync de ${productId}:`, err);
    });
  }, 400);

  pendingSyncs.set(productId, timer);
}
