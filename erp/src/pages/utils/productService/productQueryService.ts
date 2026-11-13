import { supabase } from '@/pages/utils/supabaseConfig';
import type Product from '../../types/product.type';
import type { ComboItem, Variation } from '../../types/product.type';
import { getProductSalesStats, searchHistoricalItems } from './productAnalyticsQueryService';
import { applyProductFiltersAndSort, type ProductQueryFilterOptions } from './productFilterBuilder';
import { getLocalProducts, saveLocalProducts } from './productLocalCache';
import { mapFromDB } from './productMapper';
import {
  mapProductComponentAutocompleteCandidate,
  PRODUCT_COMPONENT_AUTOCOMPLETE_COLUMNS,
} from './productAutocompleteCandidateMapper';
import {
  mapProductVariationBarcodeCandidate,
  PRODUCT_VARIATION_BARCODE_CANDIDATE_COLUMNS,
} from './productVariationBarcodeCandidateMapper';
import { TABLE_NAME } from './productSkuService';
import { calculateCompositionAvailability } from '../compositionMath';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';

export { getProductSalesStats, searchHistoricalItems };

export const LIGHT_COLUMNS =
  'id, name, marketplace_title, code, description, observations, brand, category_id, category, condition, product_kind, is_salvado, opportunity_id, width, height, depth, unit_price, price, cost_price, freight_type, freight_cost, ipi_percent, final_purchase_price, promo_price, initial_stock, stock, min_stock, unit, active, is_draft, status, deleted, supplier_id, main_supplier_id, supplier_ids, images, has_variations, item_type, created_at, updated_at, slug, featured, is_combo, combo_items, technical_specs';
export const LIGHT_COLUMNS_WITH_CATS =
  LIGHT_COLUMNS +
  ', product_categories(*, categories(*)), product_variations(*), product_images(image_url,is_main), category_details:categories!products_category_id_fkey(id, name)';

/** Saldo de um produto composto é a quantidade de kits montáveis com o estoque atual dos componentes. */
export const applyCompositionAvailability = async (products: Product[]): Promise<Product[]> => {
  const compositions = products.filter((product) => product.itemType === 'composition');
  if (!compositions.length) return products;

  const unavailable = () =>
    products.map((product) =>
      product.itemType === 'composition'
        ? {
            ...product,
            stock: 0,
            variations: product.variations?.map((variation) => ({ ...variation, stock: 0 })),
          }
        : product
    );

  const componentIds = Array.from(
    new Set(
      compositions.flatMap((product) => [
        ...(product.comboItems || []),
        ...(product.variations || []).flatMap((variation) => variation.comboItems || []),
      ])
        .map((item) => String(item.productId || '').trim())
        .filter(Boolean)
    )
  );
  if (!componentIds.length) return unavailable();

  const lookup = await withAbortTimeout(
    supabase
      .from(TABLE_NAME)
      .select('id, stock, product_variations(id, stock)')
      .in('id', componentIds),
    'catalogo:saldo-produtos-compostos'
  ).then((result) => ({ result })).catch(() => null);
  if (!lookup || lookup.result.error) {
    console.warn('[ProductService] Não foi possível consultar o estoque atual dos componentes.');
    return unavailable();
  }

  const currentComponents = new Map<string, { stock: number; variations: Map<string, number> }>();
  for (const row of lookup.result.data || []) {
    const variations = new Map<string, number>();
    for (const variation of row.product_variations || []) {
      variations.set(String(variation.id), Number(variation.stock) || 0);
    }
    currentComponents.set(String(row.id), {
      stock: Number(row.stock) || 0,
      variations,
    });
  }

  const availabilityFor = (items: ComboItem[] | undefined): number => {
    if (!items?.length) return 0;
    const requirements = new Map<string, { currentStock: number; quantityNeeded: number }>();
    for (const item of items) {
      const component = currentComponents.get(String(item.productId));
      const currentStock = item.variationId
        ? component?.variations.get(String(item.variationId)) ?? 0
        : component?.stock ?? 0;
      const key = `${item.productId}:${item.variationId || ''}`;
      const existing = requirements.get(key);
      requirements.set(key, {
        currentStock,
        quantityNeeded: (existing?.quantityNeeded || 0) + Number(item.quantity),
      });
    }
    const components = Array.from(requirements.values());
    if (components.some((item) => !Number.isFinite(item.quantityNeeded) || item.quantityNeeded <= 0)) {
      return 0;
    }
    return calculateCompositionAvailability(components);
  };

  return products.map((product) => {
    if (product.itemType !== 'composition') return product;

    const rootItems = product.comboItems || [];
    const hasVariationComposition = (product.variations || []).some(
      (variation) => Boolean(variation.comboItems?.length)
    );
    const variations = product.variations?.map((variation) => ({
      ...variation,
      stock: availabilityFor(variation.comboItems?.length ? variation.comboItems : rootItems),
    }));
    const stock = hasVariationComposition
      ? (variations || []).reduce((total, variation) => total + (Number(variation.stock) || 0), 0)
      : availabilityFor(rootItems);

    return { ...product, stock, variations };
  });
};

// Helper to initialize products from Supabase
export const initializeProductsIfEmpty = async (): Promise<Product[]> => {
  try {
    console.log(
      '[ProductService] Carregando produtos a partir da tabela do Supabase do e-commerce...'
    );
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let fetchMore = true;

    while (fetchMore) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(LIGHT_COLUMNS_WITH_CATS)
        .order('created_at', { ascending: false })
        .range(from, from + step - 1);

      if (error) {
        console.error('[ProductService] Erro ao buscar produtos do Supabase:', error);
        return getLocalProducts();
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        if (data.length < step) fetchMore = false;
      } else {
        fetchMore = false;
      }
    }

    const fetchedProducts = await applyCompositionAvailability(
      allData.map((p, idx) => mapFromDB(p, idx))
    );
    saveLocalProducts(fetchedProducts);
    return fetchedProducts;
  } catch (e) {
    console.error('[ProductService] Exceção ao sincronizar dados do Supabase:', e);
    return getLocalProducts();
  }
};

export const fetchProductsPage = async (
  page: number,
  pageSize: number,
  options?: ProductQueryFilterOptions,
  requestOptions: {
    throwOnError?: boolean;
    includeTrashEligibility?: boolean;
    includeTotal?: boolean;
    productProjection?: 'componentAutocomplete';
    searchVariationsAsEmbed?: boolean;
  } = {}
): Promise<{ data: Product[]; total: number }> => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';
    const ascending = sortOrder === 'asc';

    const columnMap: Record<string, string> = {
      description: 'description',
      unitPrice: 'unit_price',
      stock: 'stock',
      code: 'code',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      category: 'category',
    };
    const orderColumn = columnMap[sortBy] || 'created_at';

    const isComponentAutocompleteProjection =
      requestOptions.productProjection === 'componentAutocomplete';
    const searchVariationsAsEmbed = Boolean(requestOptions.searchVariationsAsEmbed && options?.search);
    const projection = isComponentAutocompleteProjection
      ? PRODUCT_COMPONENT_AUTOCOMPLETE_COLUMNS
      : LIGHT_COLUMNS_WITH_CATS;
    const baseQuery = supabase.from(TABLE_NAME).select(
      searchVariationsAsEmbed ? `${projection},search_variations:product_variations()` : projection,
      requestOptions.includeTotal === false ? {} : { count: 'exact' }
    );

    const filters = {
      ...options,
      ...(isComponentAutocompleteProjection ? { excludeCombos: true } : {}),
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

    const productUuids = (data || [])
      .map((p: any) => p.id)
      .filter((id: any) =>
        Boolean(
          id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id))
        )
      );

    const eligibilityMap = new Map<
      string,
      { can_trash: boolean; trash_block_reason: string | null }
    >();
    const campaignByProduct = new Map<string, any>();
    const campaignByVariation = new Map<string, any>();

    if (productUuids.length > 0) {
      const [eligibilityResult, campaignResult] = await Promise.allSettled([
        requestOptions.includeTrashEligibility === false
          ? Promise.resolve({ data: [], error: null })
          : withAbortTimeout(
              supabase.rpc('get_products_trash_eligibility', { p_product_ids: productUuids }),
              'products:trash-eligibility',
            ),
        withAbortTimeout(
          supabase
            .from('active_campaign_prices')
            .select('product_id, variation_id, promotion_id, promotion_name, promotion_discount_percent')
            .in('product_id', productUuids),
          'products:active-campaign-prices',
        ),
      ]);

      if (eligibilityResult.status === 'fulfilled' && !eligibilityResult.value.error && Array.isArray(eligibilityResult.value.data)) {
        eligibilityResult.value.data.forEach((item: any) => {
          if (item.product_id) {
            eligibilityMap.set(String(item.product_id), {
              can_trash: Boolean(item.can_trash),
              trash_block_reason: item.trash_block_reason || null,
            });
          }
        });
      } else if (eligibilityResult.status === 'rejected') {
        console.warn('[ProductService] Falha ao verificar elegibilidade de lixeira em lote:', eligibilityResult.reason);
      }

      if (campaignResult.status === 'fulfilled' && !campaignResult.value.error) {
        for (const campaign of campaignResult.value.data || []) {
          if (campaign.variation_id) campaignByVariation.set(String(campaign.variation_id), campaign);
          else campaignByProduct.set(String(campaign.product_id), campaign);
        }
      } else {
        throw campaignResult.status === 'rejected'
          ? campaignResult.reason
          : campaignResult.value.error;
      }
    }

    const mapped: Product[] = (data || []).map((p: any, idx: number) => {
      const product = isComponentAutocompleteProjection
        ? mapProductComponentAutocompleteCandidate(p, idx)
        : mapFromDB(p, idx);
      const productCampaign = campaignByProduct.get(String(product.id || ''));
      const currentProduct = productCampaign
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
    });

    return {
      data: isComponentAutocompleteProjection
        ? mapped
        : await applyCompositionAvailability(mapped),
      total: count ?? 0,
    };
  } catch (e) {
    console.error('[ProductService] Exceção em fetchProductsPage:', e);
    if (requestOptions.throwOnError) throw e;
    return { data: [], total: 0 };
  }
};

export const getFullProduct = async (id: string): Promise<Product | null> => {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const mapped = (await applyCompositionAvailability([mapFromDB(data)]))[0];
        const localProducts = getLocalProducts();
        const idx = localProducts.findIndex((p) => String(p.id) === String(id));
        if (idx !== -1) {
          localProducts[idx] = mapped;
        } else {
          localProducts.push(mapped);
        }
        saveLocalProducts(localProducts);
        return mapped;
      }
    }
  } catch (e) {
    console.error('[ProductService] Erro ao buscar produto detalhado do Supabase:', e);
  }

  const products = getLocalProducts();
  const product = products.find((p) => String(p.id) === String(id));
  return product
    ? (await applyCompositionAvailability([product]))[0]
    : null;
};

export const getFullProductsByIds = async (ids: string[]): Promise<Map<string, Product>> => {
  const uniqueIds = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
  const result = new Map<string, Product>();
  if (!uniqueIds.length) return result;

  const uuidIds = uniqueIds.filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );

  if (uuidIds.length) {
    try {
      const { data, error } = await withAbortTimeout(
        supabase
          .from(TABLE_NAME)
          .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
          .in('id', uuidIds),
        'products:full-by-ids',
      );
      if (error) throw error;

      const mapped = await applyCompositionAvailability((data || []).map((row) => mapFromDB(row)));
      const localProducts = getLocalProducts();
      for (const product of mapped) {
        const id = String(product.id);
        result.set(id, product);
        const index = localProducts.findIndex((cached) => String(cached.id) === id);
        if (index === -1) localProducts.push(product);
        else localProducts[index] = product;
      }
      if (mapped.length) saveLocalProducts(localProducts);
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
    // If the batch returned some products but not all, recheck only the missing
    // IDs individually before using local data. This preserves the previous
    // fresh-read behavior if the server response was incomplete.
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

export const getProductsByIds = async (ids: string[]): Promise<Product[]> => {
  const products = getLocalProducts();
  const idStrings = ids.map(String);
  return products.filter((p) => idStrings.includes(String(p.id)));
};

/** Busca GTIN na coluna de detalhes das variações, sem criar coluna ou migration. */
export const findProductByVariationBarcode = async (
  barcode: string,
): Promise<{ product: Product; variation: Variation } | null> => {
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
    product.variations?.some((variation) => String(variation.barcode || '').replace(/\D/g, '') === normalizedBarcode),
  );
  const variation = cachedMatch?.variations?.find(
    (candidate) => String(candidate.barcode || '').replace(/\D/g, '') === normalizedBarcode,
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
    { throwOnError: true },
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

export const getProductByCode = async (
  code: string
): Promise<{ product: Product; variation?: Variation } | null> => {
  try {
    const products = getLocalProducts().filter((p) => !p.deleted);

    const directMatch = products.find((p) => p.code === code);
    if (directMatch) {
      return { product: directMatch };
    }

    for (const p of products) {
      const variation = p.variations?.find((v) => v.sku === code);
      if (variation) {
        return { product: p, variation };
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar produto por código:', error);
    return null;
  }
};
