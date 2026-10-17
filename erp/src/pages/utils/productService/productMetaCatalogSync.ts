import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings } from '@/pages/utils/settingsService';
import { whatsappGraphService } from '@/pages/utils/whatsappGraphService';
import { isTestProduct } from '../hmlTestData';
import {
  fetchMetaCatalogSyncSources,
  type MetaCatalogSyncSources,
} from '@/pages/App/Products/MetaCatalog/services/metaCatalogDataService';
import {
  buildMetaCatalogItems,
  type MetaCatalogItem,
  type MetaCatalogProductSource,
  type MetaCatalogVariationSource,
} from '@/pages/App/Products/MetaCatalog/services/metaCatalogPayload';

/**
 * Cache de temporizadores para debounce por productId,
 * evitando disparos múltiplos durante mutações sequenciais.
 */
const pendingSyncs = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Executa a sincronização de todos os produtos do sistema com a Meta Catalog API.
 * Usado pelo botão manual nos 3 pontinhos e na tela de Catálogo Meta.
 */
export async function syncAllProductsToMetaCatalog(
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: boolean; count: number; handles?: string[] }> {
  const { whatsappConfig } = getSettings();
  if (!whatsappConfig?.catalogId || !whatsappConfig?.accessToken) {
    throw new Error('Credenciais da Meta não configuradas no sistema (Configurações > WhatsApp/Meta).');
  }

  const { products, variations, opportunities } = await fetchMetaCatalogSyncSources();
  const allItems = buildMetaCatalogItems(products, variations, opportunities);

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
    if (!whatsappConfig?.catalogId || !whatsappConfig?.accessToken) {
      return { success: false, count: 0, error: 'Credenciais da Meta não configuradas.' };
    }

    if (!productId) return { success: false, count: 0, error: 'ID do produto ausente.' };

    // Buscar produto e suas variações no banco
    const [
      { data: product, error: prodErr },
      { data: variations, error: varErr },
      { data: opportunities },
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
      supabase.from('opportunities').select('id, name, observations'),
    ]);

    if (prodErr || !product) {
      return { success: false, count: 0, error: prodErr?.message || 'Produto não encontrado.' };
    }

    if (isTestProduct(product)) {
      return { success: true, count: 0 };
    }

    const itemsToSend: any[] = [];
    const isParentEligible =
      product.status === 'published' &&
      !product.deleted_at &&
      !product.deleted &&
      !product.is_draft;

    const varList = (variations || []) as MetaCatalogVariationSource[];
    const hasVariations = varList.length > 0;

    if (hasVariations) {
      // O ID pai de um produto que possui variações nunca é vendido avulso
      itemsToSend.push({
        id: product.id,
        code: product.code || product.id,
        deleted: true,
        status: 'hidden',
      });

      if (!isParentEligible) {
        // Se o pai foi desativado/ocultado, remove todas as variações da Meta
        for (let idx = 0; idx < varList.length; idx++) {
          const v = varList[idx];
          const varSku =
            String(v.sku || v.code || '').trim() ||
            (product.code ? `${product.code}-${String(idx + 1).padStart(2, '0')}` : v.id);
          itemsToSend.push({
            id: v.id,
            code: varSku,
            deleted: true,
            status: 'hidden',
          });
        }
      } else {
        // Pai está publicado: envia cada variação com seu respectivo status
        const singleSources: MetaCatalogSyncSources = {
          products: [product as MetaCatalogProductSource],
          variations: varList,
          opportunities: (opportunities || []) as any[],
        };
        const built = buildMetaCatalogItems(
          singleSources.products,
          singleSources.variations,
          singleSources.opportunities
        );

        const publishedIds = new Set(built.map((item) => item.code));

        for (let idx = 0; idx < varList.length; idx++) {
          const v = varList[idx];
          const varCode =
            String(v.sku || v.code || '').trim() ||
            (product.code ? `${product.code}-${String(idx + 1).padStart(2, '0')}` : v.id);
          if (publishedIds.has(varCode)) {
            const item = built.find((b) => b.code === varCode);
            if (item) itemsToSend.push(item);
          } else {
            // Variação inativa ou oculta -> DELETE na Meta
            itemsToSend.push({
              id: v.id,
              code: varCode,
              deleted: true,
              status: 'hidden',
            });
          }
        }
      }
    } else {
      // Produto simples sem variações
      if (!isParentEligible) {
        itemsToSend.push({
          id: product.id,
          code: product.code || product.id,
          deleted: true,
          status: 'hidden',
        });
      } else {
        const built = buildMetaCatalogItems(
          [product as MetaCatalogProductSource],
          [],
          (opportunities || []) as any[]
        );
        if (built.length > 0) {
          itemsToSend.push(...built);
        }
      }
    }

    if (itemsToSend.length === 0) return { success: true, count: 0 };

    const result = await whatsappGraphService.syncBatchProductsToCatalog(itemsToSend);
    return { success: true, count: itemsToSend.length };
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
      }
    }).catch((err) => {
      console.warn(`[MetaCatalogSync] Erro no background sync de ${productId}:`, err);
    });
  }, 400);

  pendingSyncs.set(productId, timer);
}
