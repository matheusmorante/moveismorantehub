import { getSettings } from '@/pages/utils/settingsService';
import {
  buildMetaCatalogDescription,
  resolveProductType,
} from '../../../../../shared-utils/metaCatalogPayload';
import {
  buildMetaCatalogBatchPayload,
  formatMetaCatalogDecimalPrice as formatDecimalPrice,
  META_CATALOG_BATCH_LIMIT,
  META_CATALOG_FALLBACK_IMAGE_URL,
  sanitizeMetaCatalogImageUrl as sanitizeImageUrl,
} from '../../../../../shared-utils/metaCatalogBatchPayload';
import { metaHttpClient } from './metaHttpClient';
import { metaErrorHandler } from './metaErrorHandler';
import type { WhatsAppProduct, MetaProductSet, MetaBatchSyncResult } from './types';

/**
 * Serviço especializado na gestão de catálogo de produtos e coleções na Meta Catalog API.
 * Responsável por consultas de catálogo, sincronização individual e em lotes (items_batch).
 */
export const metaCatalogService = {
  /**
   * Busca todos os produtos ativos e visíveis no Catálogo da Meta
   */
  fetchCatalogProducts: async (): Promise<WhatsAppProduct[]> => {
    const { whatsappConfig } = getSettings();
    if (!whatsappConfig?.catalogId) {
      console.error('Catalog ID não configurado.');
      return [];
    }

    try {
      const response = await metaHttpClient.request('list_catalog_products');

      const data = await response.json();
      if (!response.ok || data.error) {
        console.error('[MetaCatalogService] Erro Meta API:', data.error || data);
        const errorMsg = data.error
          ? metaErrorHandler.parseMetaErrorMessage(data.error)
          : `Erro HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      const products = data.data || [];
      return products.filter((p: any) => p.visibility !== 'staging' && p.is_hidden !== true);
    } catch (error: any) {
      console.error('Erro ao carregar catálogo do WhatsApp/Meta:', error);
      const metaError = error.message || 'Erro desconhecido na API da Meta';
      throw new Error(`Falha ao acessar catálogo: ${metaError}`, { cause: error });
    }
  },

  /**
   * Sincroniza um produto individual (ou o remove) do Catálogo da Meta
   */
  syncProductToCatalog: async (product: any, action: 'UPDATE' | 'DELETE' = 'UPDATE') => {
    const settings = getSettings();
    const { whatsappConfig } = settings;
    if (!whatsappConfig?.catalogId) throw new Error('Catalog ID não configurado.');

    const rawPrice = product.unitPrice ?? product.unit_price ?? product.price ?? 0;

    const isInactiveOrHidden =
      product.hidden === true ||
      product.status === 'hidden' ||
      product.status === 'draft' ||
      product.deleted === true ||
      (product.deleted_at !== undefined && product.deleted_at !== null);
    const targetAction = isInactiveOrHidden ? 'DELETE' : action;

    const cleanTitle =
      product.name ||
      product.title ||
      (product.description ? String(product.description).split('\n')[0] : 'Produto Morante');
    const productDescription =
      product.whatsappDescription ||
      product.whatsapp_description ||
      product.description ||
      cleanTitle;
    const cleanDescription = buildMetaCatalogDescription(
      productDescription,
      settings.channelBaseDescriptions?.whatsapp
    );

    const singleImageUrls: string[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((imgItem: any) => {
        if (imgItem) {
          String(imgItem)
            .split(',')
            .forEach((url) => {
              const trimmed = url.trim();
              if (trimmed && !singleImageUrls.includes(trimmed)) singleImageUrls.push(trimmed);
            });
        }
      });
    } else if (product.image_url) {
      String(product.image_url)
        .split(',')
        .forEach((url) => {
          const trimmed = url.trim();
          if (trimmed && !singleImageUrls.includes(trimmed)) singleImageUrls.push(trimmed);
        });
    }

    const sanitizedImages = singleImageUrls.map((u) => sanitizeImageUrl(u)).filter(Boolean);
    const mainImageUrl =
      sanitizedImages.length > 0 ? sanitizedImages[0] : META_CATALOG_FALLBACK_IMAGE_URL;
    const additionalImageUrls = sanitizedImages.length > 1 ? sanitizedImages.slice(1, 10) : [];

    const retailerId = String(product.code || product.sku || product.id);
    const itemPrice = Number(rawPrice || 0);
    const promoPrice = (product.promo_price ?? product.promoPrice) ? Number(product.promo_price ?? product.promoPrice) : 0;
    const hasPromo = promoPrice > 0 && promoPrice < itemPrice;
    const currentPrice = hasPromo ? promoPrice : itemPrice;
    const oldPriceFormatted = hasPromo ? formatDecimalPrice(itemPrice) : undefined;
    const oppName = product.opportunityName || product.opportunity_name || (product.opportunities?.name) || '';
    const productType =
      product.productType ||
      (product.groupName && product.groupName !== 'Furniture' ? product.groupName : undefined) ||
      (product.group_name && product.group_name !== 'Furniture' ? product.group_name : undefined) ||
      resolveProductType(product);

    const condition =
      product.condition === 'used' || product.condition === 'usado'
        ? 'used'
        : product.is_salvado || product.condition === 'refurbished'
          ? 'refurbished'
          : 'new';

    const productLink =
      product.url ||
      (product.slug
        ? `https://moveismorante.com.br/produto/${product.slug}`
        : `https://moveismorante.com.br/produto/${product.id}`);

    const quantityToSell =
      product.stock !== null && product.stock !== undefined
        ? Math.max(0, Number(product.stock))
        : 1;

    const batchRequest = {
      item_type: 'PRODUCT_ITEM',
      requests: [
        {
          method: targetAction,
          retailer_id: retailerId,
          data:
            targetAction === 'UPDATE'
              ? {
                  id: retailerId,
                  title: cleanTitle,
                  description: cleanDescription,
                  price: `${itemPrice.toFixed(2)} BRL`,
                  sale_price: hasPromo ? `${promoPrice.toFixed(2)} BRL` : undefined,
                  condition,
                  availability: isInactiveOrHidden ? 'out of stock' : 'in stock',
                  image_link: mainImageUrl,
                  additional_image_link: additionalImageUrls.join(',') || undefined,
                  brand: product.brand || 'Móveis Morante',
                  link: productLink,
                  product_type: productType,
                  item_group_id: '',
                  custom_label_0: productType,
                  custom_label_1: formatDecimalPrice(currentPrice),
                  custom_label_2: oldPriceFormatted,
                  custom_label_3: oppName || undefined,
                  color: product.color || undefined,
                  size: product.size || undefined,
                  material: product.material || undefined,
                  gender: 'unisex',
                  identifier_exists: 'no',
                  quantity_to_sell_on_facebook: quantityToSell,
                }
              : undefined,
        },
      ],
    };

    try {
      const response = await metaHttpClient.request('sync_catalog_batch', { payload: batchRequest });

      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('[MetaCatalogService] Erro no Batch Sync:', data.error || data);
        if (data.error) {
          throw new Error(metaErrorHandler.parseMetaErrorMessage(data.error));
        }
        throw new Error('Erro desconhecido ao sincronizar com a Meta.');
      }

      return data;
    } catch (error: any) {
      console.error('Erro fatal no sync WhatsApp/Meta:', error);
      throw error;
    }
  },

  /**
   * Remove um produto do Catálogo da Meta pelo retailerId (SKU ou ID)
   */
  deleteProductFromCatalog: async (retailerId: string) => {
    return metaCatalogService.syncProductToCatalog({ code: retailerId }, 'DELETE');
  },

  /**
   * Sincroniza uma lista inteira de produtos em lotes via Batch Request da Meta Graph API (items_batch)
   */
  syncBatchProductsToCatalog: async (
    productsList: any[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<MetaBatchSyncResult> => {
    const settings = getSettings();
    const { whatsappConfig } = settings;
    if (!whatsappConfig?.catalogId) throw new Error('Catalog ID não configurado.');

    if (!productsList || productsList.length === 0) return { success: true, count: 0 };

    const BATCH_SIZE = META_CATALOG_BATCH_LIMIT;
    let syncedCount = 0;
    const total = productsList.length;
    const handles: string[] = [];

    if (onProgress) onProgress(0, total);

    for (let i = 0; i < productsList.length; i += BATCH_SIZE) {
      const chunk = productsList.slice(i, i + BATCH_SIZE);
      const payload = buildMetaCatalogBatchPayload(
        chunk,
        settings.channelBaseDescriptions?.whatsapp
      );
      const response = await metaHttpClient.request('sync_catalog_batch', { payload });
      const data = await response.json();
      if (!response.ok || data.error) {
        console.error('[MetaCatalogService] Erro no Lote Meta API:', data.error || data);
        if (data.error) {
          throw new Error(metaErrorHandler.parseMetaErrorMessage(data.error));
        }
        throw new Error('Erro no envio em lote da Meta API.');
      }

      if (data.handles && Array.isArray(data.handles)) {
        handles.push(...data.handles);
      }

      syncedCount += chunk.length;
      if (onProgress) onProgress(syncedCount, total);
    }

    return { success: true, count: syncedCount, handles };
  },

  /**
   * Consulta o status assíncrono de um lote enviado ao Meta Catalog
   */
  checkBatchStatus: async (handle: string) => {
    const { whatsappConfig } = getSettings();
    if (!whatsappConfig?.catalogId) throw new Error('Catalog ID não configurado.');

    const response = await metaHttpClient.request('check_catalog_batch', { handle });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Erro ao consultar status do lote.');
    return data;
  },

  /**
   * Lista as coleções (product sets) do catálogo na Meta
   */
  listProductSets: async (): Promise<MetaProductSet[]> => {
    const { whatsappConfig } = getSettings();
    if (!whatsappConfig?.catalogId) throw new Error('Catalog ID não configurado.');

    const response = await metaHttpClient.request('list_product_sets');
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Erro ao listar coleções.');
    return data.data || [];
  },

  /**
   * Deleta uma coleção (product set) da Meta pelo ID
   */
  deleteProductSet: async (productSetId: string): Promise<boolean> => {
    const response = await metaHttpClient.request('delete_product_set', { productSetId });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Erro ao deletar coleção.');
    return data.success === true;
  },
};
