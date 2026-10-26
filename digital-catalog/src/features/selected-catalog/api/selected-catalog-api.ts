import { supabase } from '@/lib/supabase/client';
import type {
  SelectedCatalogItemToken,
  SelectedCatalogProduct,
  SelectedCatalogRequest,
  SelectedCatalogResult,
} from '../types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 20;

const parseItemTokens = (values: string[]): SelectedCatalogItemToken[] => {
  const tokens: SelectedCatalogItemToken[] = [];
  for (const token of values.slice(0, 50)) {
    const [productId, variationId] = token.split('~');
    if (!UUID_PATTERN.test(productId || '') || (variationId && !UUID_PATTERN.test(variationId))) continue;
    tokens.push({ productId, ...(variationId ? { variationId } : {}) });
  }
  return tokens;
};

const parseExcludedProductIds = (values: string[]) =>
  Array.from(new Set(values.flatMap((value) => value.split(','))
    .filter((id) => UUID_PATTERN.test(id))))
    .slice(0, 100);

export const fetchSelectedCatalog = async (
  request: SelectedCatalogRequest,
  page = 1,
  signal?: AbortSignal,
): Promise<SelectedCatalogResult> => {
  const itemTokens = parseItemTokens(request.itemTokens);
  if (request.itemTokens.length > 0 && itemTokens.length === 0) {
    return { products: [], itemTokens, categoryName: '', totalCount: 0, page, pageSize: PAGE_SIZE };
  }

  const hasScope = request.allProducts || Boolean(request.categoryId || request.search || request.brand);
  if (!hasScope && !itemTokens.length) {
    return { products: [], itemTokens, categoryName: '', totalCount: 0, page, pageSize: PAGE_SIZE };
  }

  const includeProductIds = Array.from(new Set(itemTokens.map((token) => token.productId)));
  let query = supabase.rpc('customer_support_catalog_summary_page', {
    p_category_id: request.categoryId || null,
    p_search: request.search,
    p_brand: request.brand,
    p_page: page,
    p_page_size: PAGE_SIZE,
    p_excluded_product_ids: parseExcludedProductIds(request.excludedProductIds),
    p_include_product_ids: includeProductIds,
    p_include_only: !hasScope,
  });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  if (!data || typeof data !== 'object' || !Array.isArray(data.products)) {
    throw new Error('Não foi possível carregar esta seleção do catálogo.');
  }

  const requestedVariations = itemTokens.filter((token) => token.variationId);
  const variationsByProduct = new Map<string, Array<Record<string, any>>>();
  if (requestedVariations.length) {
    let detailsQuery = supabase.rpc('customer_support_catalog_product_details', {
      p_product_ids: Array.from(new Set(requestedVariations.map((token) => token.productId))),
      p_variation_ids: Array.from(new Set(requestedVariations.flatMap((token) => token.variationId ? [token.variationId] : []))),
    });
    if (signal) detailsQuery = detailsQuery.abortSignal(signal);
    const { data: details, error: detailsError } = await detailsQuery;
    if (detailsError) throw detailsError;
    if (!Array.isArray(details)) throw new Error('Não foi possível carregar as variações selecionadas.');
    for (const row of details as Array<{ productId?: unknown; variations?: unknown }>) {
      if (typeof row.productId === 'string' && Array.isArray(row.variations)) {
        variationsByProduct.set(row.productId, row.variations as Array<Record<string, any>>);
      }
    }
  }

  const products = (data.products as Array<Record<string, any>>).map((product): SelectedCatalogProduct => ({
    id: String(product.id),
    name: String(product.title || product.name || ''),
    slug: typeof product.slug === 'string' ? product.slug : null,
    description: null,
    price: Number(product.price) || 0,
    promo_price: Number(product.promoPrice) || null,
    brand: typeof product.brand === 'string' ? product.brand : null,
    image_url: typeof product.imageUrl === 'string' ? product.imageUrl : null,
    product_variations: (variationsByProduct.get(String(product.id)) || (Array.isArray(product.variations) ? product.variations : [])).map((variation: Record<string, any>) => ({
      id: String(variation.id),
      name: String(variation.name || ''),
      price: Number(variation.price) || 0,
      promo_price: Number(variation.promoPrice) || null,
      image_url: typeof variation.imageUrl === 'string' ? variation.imageUrl : null,
      attributes: variation.attributes,
      status: 'published',
      active: true,
    })),
  }));

  return {
    products,
    itemTokens,
    categoryName: typeof data.categoryName === 'string' ? data.categoryName : '',
    totalCount: Number(data.totalCount) || 0,
    page: Number(data.page) || page,
    pageSize: Number(data.pageSize) || PAGE_SIZE,
  };
};
