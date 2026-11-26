const CATALOG_BASE_URL = 'https://www.moveismorante.com.br';
const MAX_CATALOG_URL_LENGTH = 3800;

interface ProductCatalogLinkInput {
  items: readonly { productId: string; variationId?: string }[];
  bulkScope: {
    filters: { categoryId: string | null; search: string; brand: string };
    excludedProductIds: readonly string[];
  } | null;
  hidePrices: boolean;
}

export const buildProductCatalogUrl = ({ items, bulkScope, hidePrices }: ProductCatalogLinkInput): string | null => {
  const url = new URL('/selecionados', CATALOG_BASE_URL);
  if (bulkScope) {
    const { categoryId, search, brand } = bulkScope.filters;
    if (categoryId) url.searchParams.set('c', categoryId);
    if (search) url.searchParams.set('q', search);
    if (brand) url.searchParams.set('b', brand);
    if (!categoryId && !search && !brand) url.searchParams.set('a', '1');
    if (bulkScope.excludedProductIds.length) {
      url.searchParams.set('ep', bulkScope.excludedProductIds.join(','));
    }
  }
  if (items.length) {
    if (items.length > 50) return null;
    url.searchParams.set('i', items.map((item) => `${item.productId}~${item.variationId || ''}`).join(','));
  }
  if (!bulkScope && !items.length) return null;
  if (hidePrices) url.searchParams.set('preco', 'oculto');
  return url.toString().length <= MAX_CATALOG_URL_LENGTH ? url.toString() : null;
};
