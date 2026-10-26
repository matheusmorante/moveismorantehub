import { supabase, supabasePublicUrl } from '@/pages/utils/supabaseConfig';

export interface SupportCatalogVariation {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  promoPrice: number;
  imageUrl: string | null;
  attributes: unknown;
}

export interface SupportCatalogProduct {
  id: string;
  name: string;
  title: string | null;
  sku: string | null;
  slug: string;
  brand: string | null;
  category: string;
  price: number;
  promoPrice: number;
  imageUrl: string;
  hasVariations: boolean;
  variations: SupportCatalogVariation[];
}

export interface SupportCatalogFilters {
  categoryId: string | null;
  search: string;
  brand: string;
}

export interface SupportCatalogPage {
  page: number;
  pageSize: number;
  totalCount: number;
  categoryName: string | null;
  products: SupportCatalogProduct[];
}

export interface SupportCatalogMetadata {
  categories: Array<{ id: string; name: string; slug: string }>;
  relations: Array<{ parent_id: string; child_id: string }>;
  brands: string[];
  userId: string | null;
}

export interface SupportCatalogProductDetails {
  productId: string;
  variations: SupportCatalogVariation[];
}

const boundedSignal = (parent: AbortSignal, timeoutMs = 12_000) => {
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  if (parent.aborted) abort();
  else parent.addEventListener('abort', abort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(new DOMException('Catálogo expirou.', 'TimeoutError')), timeoutMs);
  return {
    signal: controller.signal,
    dispose: () => {
      window.clearTimeout(timeout);
      parent.removeEventListener('abort', abort);
    },
  };
};

export const fetchSupportCatalogMetadata = async (signal: AbortSignal): Promise<SupportCatalogMetadata> => {
  const request = boundedSignal(signal);
  let sessionTimeout: number | undefined;
  try {
    const sessionPromise = Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) => {
        sessionTimeout = window.setTimeout(() => reject(new Error('A sessão expirou ao carregar o catálogo.')), 10_000);
      }),
    ]);
    const [sessionResult, metadataResult] = await Promise.all([
      sessionPromise,
      supabase.rpc('customer_support_catalog_metadata').abortSignal(request.signal),
    ]);
    if (sessionResult.error) throw sessionResult.error;
    if (metadataResult.error) throw metadataResult.error;
    const metadata = metadataResult.data as {
      categories?: SupportCatalogMetadata['categories'];
      relations?: SupportCatalogMetadata['relations'];
      brands?: string[];
    } | null;
    return {
      categories: metadata?.categories || [],
      relations: metadata?.relations || [],
      brands: metadata?.brands || [],
      userId: sessionResult.data.session?.user.id || null,
    };
  } finally {
    if (sessionTimeout !== undefined) window.clearTimeout(sessionTimeout);
    request.dispose();
  }
};

export const fetchSupportCatalogPage = async (
  filters: SupportCatalogFilters,
  page: number,
  signal: AbortSignal,
  options: { excludedProductIds?: string[]; includeProductIds?: string[]; includeOnly?: boolean } = {},
): Promise<SupportCatalogPage> => {
  const request = boundedSignal(signal);
  try {
    const { data, error } = await supabase.rpc('customer_support_catalog_summary_page', {
      p_category_id: filters.categoryId,
      p_search: filters.search,
      p_brand: filters.brand,
      p_page: page,
      p_page_size: 20,
      p_excluded_product_ids: options.excludedProductIds || [],
      p_include_product_ids: options.includeProductIds || [],
      p_include_only: options.includeOnly || false,
    }).abortSignal(request.signal);
    if (error) throw error;
    if (!data || typeof data !== 'object' || !Array.isArray(data.products)) {
      throw new Error('O catálogo retornou uma resposta inválida.');
    }
    return data as SupportCatalogPage;
  } finally {
    request.dispose();
  }
};

export const fetchSupportCatalogProductDetails = async (
  productIds: string[],
  signal: AbortSignal,
  variationIds: string[] = [],
): Promise<SupportCatalogProductDetails[]> => {
  if (!productIds.length || productIds.length > 50 || variationIds.length > 50) return [];
  const request = boundedSignal(signal);
  try {
    const { data, error } = await supabase.rpc('customer_support_catalog_product_details', {
      p_product_ids: productIds,
      p_variation_ids: variationIds,
    }).abortSignal(request.signal);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Os detalhes de variações retornaram uma resposta inválida.');
    return data as SupportCatalogProductDetails[];
  } finally {
    request.dispose();
  }
};

export const supportCatalogCacheContext = () => [supabasePublicUrl, 'public-customer-price'] as const;
