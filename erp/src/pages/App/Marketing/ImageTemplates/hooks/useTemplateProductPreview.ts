import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listPreviewProductGroups,
  listPreviewProducts,
  mapPreviewProduct,
  PREVIEW_PRODUCT_PAGE_SIZE,
  readPreviewProduct,
  type PreviewProductSource,
} from '../productPreviewService';
import { PRODUCT_LIST_SEARCH_DEBOUNCE_MS, PRODUCT_LIST_SEARCH_MIN_LENGTH } from '../../../../../../../shared-utils/productListSearch';
import type { TemplatePreviewProduct } from '../../../../../../../shared-utils/catalogImageTemplate';

/** Counts searchable letters and digits in a preview filter query. */
export function countPreviewSearchChars(input: string): number {
  return input.trim().replace(/[^\p{L}\p{N}]/gu, '').length;
}

/** Returns true when the debounced query has settled and satisfies the minimum search length. */
export function isPreviewSearchReady(input: string, committedSearch: string): boolean {
  const trimmed = input.trim();
  return trimmed === committedSearch
    && (!trimmed || countPreviewSearchChars(trimmed) >= PRODUCT_LIST_SEARCH_MIN_LENGTH);
}

/** Returns true when another preview product or result page follows the current position. */
export function hasNextPreviewProductPage(
  position: number,
  rowCount: number,
  page: number,
  total: number,
): boolean {
  return position < rowCount - 1 || page * PREVIEW_PRODUCT_PAGE_SIZE < total;
}

function fetchPreviewPage(page: number, search: string, categoryId: string, signal?: AbortSignal) {
  const activeSignal = signal ?? new AbortController().signal;
  return categoryId
    ? listPreviewProducts(page, search, activeSignal, categoryId)
    : listPreviewProducts(page, search, activeSignal);
}

function resolveActiveVariationId(source: Pick<PreviewProductSource, 'variations'>): string {
  const variation = source.variations.find((entry) => entry.active !== false) ?? source.variations[0];
  return variation?.id ?? '';
}

/**
 * Manages product list pagination, debounced search, detail fetching, and background
 * pre-warming of upcoming products for the image template live preview.
 */
export function useTemplateProductPreview(
  userId: string,
  requiredImageCount = 1,
  onProductWarm?: (product: TemplatePreviewProduct) => void,
) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [pendingPageEdge, setPendingPageEdge] = useState<'first' | 'last' | null>(null);

  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
      setPendingPageEdge(null);
    }, PRODUCT_LIST_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  const searchReady = isPreviewSearchReady(searchInput, search);
  const initialProducts = useQuery({
    queryKey: ['image-template-erp-products', userId, 1, '', ''],
    queryFn: ({ signal }) => listPreviewProducts(1, '', signal),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const products = useQuery({
    queryKey: ['image-template-erp-products', userId, page, search, categoryId],
    queryFn: ({ signal }) => fetchPreviewPage(page, search, categoryId, signal),
    enabled: searchReady,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const groups = useQuery({
    queryKey: ['image-template-erp-product-groups', userId],
    queryFn: ({ signal }) => listPreviewProductGroups(signal),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => products.data?.rows ?? [], [products.data?.rows]);
  const initialProductId = initialProducts.data?.rows[0]?.id;
  const fallbackProductId = initialProductId || (initialProducts.isError ? rows[0]?.id : undefined);

  useEffect(() => {
    if (!selectedProduct && fallbackProductId) setSelectedProduct(fallbackProductId);
  }, [selectedProduct, fallbackProductId]);

  const productId = selectedProduct || fallbackProductId;
  const found = rows.findIndex((row) => row.id === productId);
  const position = found >= 0 ? found : -1;

  const detail = useQuery({
    queryKey: ['image-template-erp-product', userId, productId, requiredImageCount],
    queryFn: ({ signal }) => readPreviewProduct(productId!, signal, requiredImageCount),
    enabled: !!productId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const selectedDetail = detail.data?.id === productId ? detail.data : undefined;
  const selectedRow = rows.find((row) => row.id === productId)
    ?? initialProducts.data?.rows.find((row) => row.id === productId);
  const variationId = selectedDetail ? resolveActiveVariationId(selectedDetail) : '';

  const product = useMemo(
    () => (selectedDetail
      ? mapPreviewProduct(selectedDetail, variationId)
      : selectedRow
        ? mapPreviewProduct(selectedRow.previewSource)
        : null),
    [selectedDetail, selectedRow, variationId],
  );

  useEffect(() => {
    if (!productId || position < 0 || !searchReady) return;
    let cancelled = false;
    const nextPageNumber = page + 1;
    const hasNextPage = page * PREVIEW_PRODUCT_PAGE_SIZE < (products.data?.total ?? 0);
    const nearbyRows = rows.slice(position + 1, position + 6);
    const nextPagePromise = nearbyRows.length < 5 && hasNextPage
      ? queryClient.fetchQuery({
        queryKey: ['image-template-erp-products', userId, nextPageNumber, search, categoryId],
        queryFn: ({ signal }) => fetchPreviewPage(nextPageNumber, search, categoryId, signal),
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: false,
      }).catch(() => null)
      : Promise.resolve(null);

    const warmRow = async (row: typeof rows[number]) => {
      if (cancelled) return;
      try {
        const source = await queryClient.fetchQuery({
          queryKey: ['image-template-erp-product', userId, row.id, requiredImageCount],
          queryFn: ({ signal }) => readPreviewProduct(row.id, signal ?? new AbortController().signal, requiredImageCount),
          staleTime: 30_000,
          gcTime: 5 * 60_000,
          retry: false,
        });
        if (!cancelled) onProductWarm?.(mapPreviewProduct(source, resolveActiveVariationId(source)));
      } catch {
        // A prévia continua carregando normalmente se o aquecimento em segundo plano falhar.
      }
    };

    const warmUpcomingProducts = async () => {
      for (const row of nearbyRows) onProductWarm?.(mapPreviewProduct(row.previewSource));
      const warmPromises = nearbyRows.map(warmRow);

      if (cancelled || nearbyRows.length >= 5) {
        await Promise.all(warmPromises);
        return;
      }
      const nextPage = await nextPagePromise;
      if (cancelled || !nextPage) return;

      const nextRows = nextPage.rows.slice(0, 5 - nearbyRows.length);
      for (const row of nextRows) onProductWarm?.(mapPreviewProduct(row.previewSource));
      warmPromises.push(...nextRows.map(warmRow));
      await Promise.all(warmPromises);
    };

    void warmUpcomingProducts();
    return () => {
      cancelled = true;
    };
  }, [
    categoryId,
    onProductWarm,
    page,
    position,
    productId,
    products.data?.total,
    queryClient,
    requiredImageCount,
    rows,
    search,
    searchReady,
    userId,
  ]);

  useEffect(() => {
    if (!pendingPageEdge || !products.isSuccess || !rows.length) return;
    const next = pendingPageEdge === 'last' ? rows[rows.length - 1] : rows[0];
    setSelectedProduct(next.id);
    setPendingPageEdge(null);
  }, [pendingPageEdge, products.isSuccess, rows]);

  function selectProduct(id: string) {
    setSelectedProduct(id);
    setPendingPageEdge(null);
  }

  function stepProduct(direction: -1 | 1) {
    const next = rows[position + direction];
    if (next) {
      selectProduct(next.id);
      return;
    }
    if (direction === 1 && page * PREVIEW_PRODUCT_PAGE_SIZE < (products.data?.total ?? 0)) {
      setPage(page + 1);
    } else if (direction === -1 && page > 1) {
      setPage(page - 1);
    } else {
      return;
    }
    setPendingPageEdge(direction === -1 ? 'last' : 'first');
  }

  function selectCategory(id: string) {
    setCategoryId(id);
    setPage(1);
    setPendingPageEdge(null);
  }

  return {
    searchInput,
    setSearchInput,
    searchReady,
    products,
    groups,
    rows,
    page,
    position,
    productId,
    detail,
    product,
    categoryId,
    selectCategory,
    variationId,
    selectProduct,
    stepProduct,
    initialProducts,
    resolveFresh: (source: PreviewProductSource) => mapPreviewProduct(source, variationId),
  };
}
