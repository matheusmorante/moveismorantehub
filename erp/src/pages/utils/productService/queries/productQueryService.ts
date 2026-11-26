import { supabase } from '@/pages/utils/supabaseConfig';
import type Product from '../../../types/product.type';
import { getProductSalesStats, searchHistoricalItems } from './productAnalyticsQueryService';
import { applyCompositionAvailability } from './compositionAvailability';
import { applyProductFiltersAndSort, type ProductQueryFilterOptions } from '../mapping/productFilterBuilder';
import {
  getProductByCode,
  getProductsByIds,
  initializeProductsIfEmpty,
  upsertLocalProducts,
} from '../drafts/productLegacyCacheQueries';
import { getLocalProducts } from '../drafts/productLocalCache';
import { mapFromDB } from '../mapping/productMapper';
import {
  mapProductComponentAutocompleteCandidate,
  PRODUCT_COMPONENT_AUTOCOMPLETE_COLUMNS,
} from './productAutocompleteCandidateMapper';
import {
  FULL_PRODUCT_COLUMNS,
  isUuid,
  LIGHT_COLUMNS,
  LIGHT_COLUMNS_WITH_CATS,
  mapPreviewProductOptionRow,
  PRODUCT_LINK_CONFIRMATION_COLUMNS,
  PRODUCT_LINK_CONFIRMATION_WITH_VARIATION_COLUMNS,
  SALES_ORDER_AUTOCOMPLETE_COLUMNS,
  toProductLinkConfirmation,
  type ProductLinkConfirmation,
  type ProductPreviewOption,
  type ProductPreviewRow,
} from './productQueryProjections';
import {
  mapProductVariationBarcodeCandidate,
  PRODUCT_VARIATION_BARCODE_CANDIDATE_COLUMNS,
  type ProductVariationBarcodeMatch,
} from './productVariationBarcodeCandidateMapper';
import { TABLE_NAME } from '../mutations/productSkuService';
import { withAbortTimeout } from '../../../../../../shared-utils/core/withAbortTimeout';

export {
  getProductSalesStats,
  searchHistoricalItems,
  applyCompositionAvailability,
  initializeProductsIfEmpty,
  getProductsByIds,
  getProductByCode,
  LIGHT_COLUMNS,
  LIGHT_COLUMNS_WITH_CATS,
  SALES_ORDER_AUTOCOMPLETE_COLUMNS,
  FULL_PRODUCT_COLUMNS,
};
export type { ProductPreviewOption, ProductLinkConfirmation, ProductVariationBarcodeMatch };

type RawProductRow = Record<string, unknown> & {
  id?: unknown;
  variation_details?: unknown;
};

interface TrashEligibilityEntry {
  can_trash: boolean;
  trash_block_reason: string | null;
}

interface TrashEligibilityRow {
  product_id?: string | number | null;
  can_trash?: boolean | null;
  trash_block_reason?: string | null;
}

interface ActiveCampaignPriceRow {
  product_id?: string | number | null;
  variation_id?: string | number | null;
  promotion_id?: string | number | null;
  promotion_name?: string | null;
  promotion_discount_percent?: number | null;
}

const SORT_COLUMN_MAP: Record<string, string> = {
  description: 'description',
  unitPrice: 'unit_price',
  stock: 'stock',
  code: 'code',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  category: 'category',
};

const resolvePageProjection = (
  productProjection?: 'componentAutocomplete' | 'salesOrderAutocomplete'
): string => {
  if (productProjection === 'componentAutocomplete') return PRODUCT_COMPONENT_AUTOCOMPLETE_COLUMNS;
  if (productProjection === 'salesOrderAutocomplete') return SALES_ORDER_AUTOCOMPLETE_COLUMNS;
  return LIGHT_COLUMNS_WITH_CATS;
};

const fetchProductsBatchMetadata = async (
  productUuids: string[],
  includeTrashEligibility: boolean
): Promise<{
  eligibilityMap: Map<string, TrashEligibilityEntry>;
  campaignByProduct: Map<string, ActiveCampaignPriceRow>;
  campaignByVariation: Map<string, ActiveCampaignPriceRow>;
}> => {
  const eligibilityMap = new Map<string, TrashEligibilityEntry>();
  const campaignByProduct = new Map<string, ActiveCampaignPriceRow>();
  const campaignByVariation = new Map<string, ActiveCampaignPriceRow>();

  if (!productUuids.length) {
    return { eligibilityMap, campaignByProduct, campaignByVariation };
  }

  const [eligibilityResult, campaignResult] = await Promise.allSettled([
    includeTrashEligibility
      ? withAbortTimeout(
          supabase.rpc('get_products_trash_eligibility', { p_product_ids: productUuids }),
          'products:trash-eligibility'
        )
      : Promise.resolve({ data: [] as TrashEligibilityRow[], error: null }),
    withAbortTimeout(
      supabase
        .from('active_campaign_prices')
        .select('product_id, variation_id, promotion_id, promotion_name, promotion_discount_percent')
        .in('product_id', productUuids),
      'products:active-campaign-prices'
    ),
  ]);

  if (
    eligibilityResult.status === 'fulfilled' &&
    !eligibilityResult.value.error &&
    Array.isArray(eligibilityResult.value.data)
  ) {
    for (const item of eligibilityResult.value.data as TrashEligibilityRow[]) {
      if (item.product_id) {
        eligibilityMap.set(String(item.product_id), {
          can_trash: Boolean(item.can_trash),
          trash_block_reason: item.trash_block_reason || null,
        });
      }
    }
  } else if (eligibilityResult.status === 'rejected') {
    console.warn(
      '[ProductService] Falha ao verificar elegibilidade de lixeira em lote:',
      eligibilityResult.reason
    );
  }

  if (campaignResult.status === 'fulfilled' && !campaignResult.value.error) {
    for (const campaign of (campaignResult.value.data || []) as ActiveCampaignPriceRow[]) {
      if (campaign.variation_id) {
        campaignByVariation.set(String(campaign.variation_id), campaign);
      } else if (campaign.product_id) {
        campaignByProduct.set(String(campaign.product_id), campaign);
      }
    }
  } else {
    throw campaignResult.status === 'rejected'
      ? campaignResult.reason
      : campaignResult.value.error;
  }

  return { eligibilityMap, campaignByProduct, campaignByVariation };
};

const enrichProductWithMetadata = (
  product: Product,
  eligibilityMap: Map<string, TrashEligibilityEntry>,
  campaignByProduct: Map<string, ActiveCampaignPriceRow>,
  campaignByVariation: Map<string, ActiveCampaignPriceRow>
): Product => {
  const productCampaign = campaignByProduct.get(String(product.id || ''));
  const currentProduct: Product = productCampaign
    ? {
        ...product,
        promotionId: String(productCampaign.promotion_id),
        promotionName: String(productCampaign.promotion_name || ''),
        promotionDiscountPercent: Number(productCampaign.promotion_discount_percent || 0),
      }
    : product;

  currentProduct.variations = currentProduct.variations?.map((variation) => {
    const campaign = campaignByVariation.get(String(variation.id));
    return campaign
      ? {
          ...variation,
          promotionId: String(campaign.promotion_id),
          promotionName: String(campaign.promotion_name || ''),
          promotionDiscountPercent: Number(campaign.promotion_discount_percent || 0),
        }
      : variation;
  });

  const eligibility = product.id ? eligibilityMap.get(product.id) : undefined;
  if (eligibility) {
    currentProduct.can_trash = eligibility.can_trash;
    currentProduct.trash_block_reason = eligibility.trash_block_reason;
  } else {
    currentProduct.can_trash = false;
    currentProduct.trash_block_reason = currentProduct.isDraft
      ? 'Rascunhos devem ser descartados diretamente'
      : 'Validando elegibilidade...';
  }

  return currentProduct;
};

export const fetchProductsPage = async (
  page: number,
  pageSize: number,
  options?: ProductQueryFilterOptions,
  requestOptions: {
    throwOnError?: boolean;
    includeTrashEligibility?: boolean;
    includeTotal?: boolean;
    productProjection?: 'componentAutocomplete' | 'salesOrderAutocomplete';
    includeCompositions?: boolean;
    searchVariationsAsEmbed?: boolean;
  } = {}
): Promise<{ data: Product[]; total: number }> => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const orderColumn = SORT_COLUMN_MAP[options?.sortBy || 'created_at'] || 'created_at';
    const ascending = (options?.sortOrder || 'desc') === 'asc';

    const isComponentAutocomplete = requestOptions.productProjection === 'componentAutocomplete';
    const isSalesOrderAutocomplete = requestOptions.productProjection === 'salesOrderAutocomplete';
    const searchVariationsAsEmbed = Boolean(requestOptions.searchVariationsAsEmbed && options?.search);
    const projection = resolvePageProjection(requestOptions.productProjection);

    const baseQuery = supabase.from(TABLE_NAME).select(
      searchVariationsAsEmbed ? `${projection},search_variations:product_variations(id)` : projection,
      requestOptions.includeTotal === false ? {} : { count: 'exact' }
    );

    const filters = {
      ...options,
      ...(isComponentAutocomplete ? { excludeCombos: true } : {}),
      ...(isSalesOrderAutocomplete
        ? requestOptions.includeCompositions
          ? { excludeCombos: false, productsAndCompositionsOnly: true }
          : { excludeCombos: true, productsOnly: true }
        : {}),
      searchVariationsAsEmbed,
    };

    const { data, error, count } = await applyProductFiltersAndSort(baseQuery, filters, {
      orderColumn,
      ascending,
      from,
      to,
    });

    if (error) {
      console.error('[ProductService] Erro na paginação do BD:', error);
      if (requestOptions.throwOnError) throw error;
      return { data: [], total: 0 };
    }

    const rows = (data || []) as RawProductRow[];
    const productUuids = rows.map((row) => row.id).filter(isUuid);
    const { eligibilityMap, campaignByProduct, campaignByVariation } =
      await fetchProductsBatchMetadata(productUuids, requestOptions.includeTrashEligibility !== false);

    const mapped: Product[] = rows.map((row, idx) => {
      const baseProduct = isComponentAutocomplete
        ? mapProductComponentAutocompleteCandidate(row, idx)
        : mapFromDB(
            isSalesOrderAutocomplete
              ? { ...row, technical_specs: { variationDetails: row.variation_details } }
              : row,
            idx
          );
      return enrichProductWithMetadata(baseProduct, eligibilityMap, campaignByProduct, campaignByVariation);
    });

    return {
      data:
        isComponentAutocomplete || isSalesOrderAutocomplete
          ? mapped
          : await applyCompositionAvailability(mapped),
      total: count ?? 0,
    };
  } catch (error) {
    console.error('[ProductService] Exceção em fetchProductsPage:', error);
    if (requestOptions.throwOnError) throw error;
    return { data: [], total: 0 };
  }
};

/** Loads only the labels used by the Publicações product selectors. */
export const fetchPreviewProductOptionsPage = async (
  page: number,
  pageSize: number,
  options?: ProductQueryFilterOptions
): Promise<{ data: ProductPreviewOption[]; hasMore: boolean }> => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    // `description` preserves the existing label fallback for legacy products without a name/title.
    const projection = 'id,name,title:marketplace_title,description';
    const baseQuery = supabase.from(TABLE_NAME).select(projection);

    const { data, error } = await applyProductFiltersAndSort(
      baseQuery,
      { ...options, searchVariationsAsEmbed: false },
      { orderColumn: 'created_at', ascending: false, from, to }
    );

    if (error) {
      console.error('[ProductService] Erro na lista compacta de produtos de prévia:', error);
      return { data: [], hasMore: false };
    }

    const rows = Array.isArray(data) ? (data as ProductPreviewRow[]) : [];
    return {
      data: rows.map(mapPreviewProductOptionRow),
      hasMore: rows.length === pageSize,
    };
  } catch (error) {
    console.error('[ProductService] Exceção na lista compacta de produtos de prévia:', error);
    return { data: [], hasMore: false };
  }
};

export const getFullProduct = async (id: string): Promise<Product | null> => {
  try {
    if (isUuid(id)) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(FULL_PRODUCT_COLUMNS)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const mapped = (await applyCompositionAvailability([mapFromDB(data)]))[0];
        upsertLocalProducts([mapped]);
        return mapped;
      }
    }
  } catch (error) {
    console.error('[ProductService] Erro ao buscar produto detalhado do Supabase:', error);
  }

  const product = getLocalProducts().find((cached) => String(cached.id) === String(id));
  return product ? (await applyCompositionAvailability([product]))[0] : null;
};

/** Confere somente os dados usados ao vincular um produto a um código de fornecedor. */
export const getProductLinkConfirmation = async (
  id: string,
  variationId?: string
): Promise<ProductLinkConfirmation | null> => {
  try {
    if (isUuid(id)) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(
          variationId
            ? PRODUCT_LINK_CONFIRMATION_WITH_VARIATION_COLUMNS
            : PRODUCT_LINK_CONFIRMATION_COLUMNS
        )
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) return toProductLinkConfirmation(mapFromDB(data), variationId);
    }
  } catch (error) {
    console.error('[ProductService] Erro ao conferir produto para vínculo do fornecedor:', error);
  }

  // Preserve the existing offline fallback without refreshing the shared cache
  // with a partial product or making an unrelated composition-stock read.
  const cachedProduct = getLocalProducts().find((product) => String(product.id) === String(id));
  return cachedProduct ? toProductLinkConfirmation(cachedProduct, variationId) : null;
};

export const getFullProductsByIds = async (ids: string[]): Promise<Map<string, Product>> => {
  const uniqueIds = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  const result = new Map<string, Product>();
  if (!uniqueIds.length) return result;

  const uuidIds = uniqueIds.filter((id) => isUuid(id));

  if (uuidIds.length) {
    try {
      const { data, error } = await withAbortTimeout(
        supabase.from(TABLE_NAME).select(FULL_PRODUCT_COLUMNS).in('id', uuidIds),
        'products:full-by-ids'
      );
      if (error) throw error;

      const mapped = await applyCompositionAvailability(
        ((data || []) as RawProductRow[]).map((row) => mapFromDB(row))
      );
      for (const product of mapped) {
        result.set(String(product.id), product);
      }
      upsertLocalProducts(mapped);
    } catch (error) {
      console.error('[ProductService] Erro ao buscar produtos detalhados em lote:', error);
      const fallbackProducts = await Promise.all(uniqueIds.map((id) => getFullProduct(id)));
      for (const product of fallbackProducts) {
        if (product?.id) result.set(String(product.id), product);
      }
      return result;
    }
  }

  const missingIds = uniqueIds.filter((id) => !result.has(id));
  if (missingIds.length) {
    if (result.size) {
      const fallbackProducts = await Promise.all(missingIds.map((id) => getFullProduct(id)));
      for (const product of fallbackProducts) {
        if (product?.id) result.set(String(product.id), product);
      }
    }

    const stillMissingIds = uniqueIds.filter((id) => !result.has(id));
    const localProducts = getLocalProducts();
    const cachedProducts = stillMissingIds
      .map((id) => localProducts.find((product) => String(product.id) === id))
      .filter((product): product is Product => Boolean(product));
    const availableCachedProducts = await applyCompositionAvailability(cachedProducts);
    for (const product of availableCachedProducts) {
      if (product.id) result.set(String(product.id), product);
    }
  }

  return result;
};

/** Busca GTIN na coluna de detalhes das variações, sem criar coluna ou migration. */
export const findProductByVariationBarcode = async (
  barcode: string
): Promise<ProductVariationBarcodeMatch | null> => {
  const normalizedBarcode = String(barcode || '').replace(/\D/g, '');
  if (!normalizedBarcode) return null;
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(PRODUCT_VARIATION_BARCODE_CANDIDATE_COLUMNS)
    .contains('technical_specs', { variationDetails: [{ barcode: normalizedBarcode }] })
    .or('deleted.eq.false,deleted.is.null')
    .limit(20);
  if (error) throw error;

  for (const row of data || []) {
    const candidate = mapProductVariationBarcodeCandidate(row, normalizedBarcode);
    if (candidate) return candidate;
  }

  const cachedMatch = getLocalProducts().find((product) =>
    product.variations?.some(
      (variation) => String(variation.barcode || '').replace(/\D/g, '') === normalizedBarcode
    )
  );
  const variation = cachedMatch?.variations?.find(
    (candidate) => String(candidate.barcode || '').replace(/\D/g, '') === normalizedBarcode
  );
  return cachedMatch && variation ? { product: cachedMatch, variation } : null;
};

/** Finds catalog names for operator review before an inbound quick registration. */
export const findInboundProductNameMatches = async (name: string): Promise<string[]> => {
  const query = String(name || '').trim();
  if (query.length < 3) return [];
  const result = await fetchProductsPage(
    1,
    12,
    { search: query, includeDeactivated: true, excludeTestProducts: true },
    { throwOnError: true }
  );
  const names = new Set<string>();
  for (const product of result.data) {
    if (product.name?.trim()) names.add(product.name.trim());
    for (const variation of product.variations || []) {
      if (variation.name?.trim()) names.add(variation.name.trim());
    }
  }
  return [...names].slice(0, 12);
};
