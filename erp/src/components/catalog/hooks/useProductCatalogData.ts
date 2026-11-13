import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import type { ProductCatalogFiltersInput } from '../../../../../shared-utils/productCatalogFormSchemas';
import {
  fetchSupportCatalogMetadata,
  fetchSupportCatalogPage,
  fetchSupportCatalogProductDetails,
  supportCatalogCacheContext,
  type SupportCatalogProduct,
  type SupportCatalogProductDetails,
} from '../supportCatalogService';
import {
  flattenCategories,
  type CategoryOption,
  type CategoryRelation,
} from '../productCatalogCategoryTree';

const CACHE_TIME = 5 * 60 * 1000;

interface UseProductCatalogDataParams {
  isOpen: boolean;
  mode: 'picker' | 'preview';
  filters: ProductCatalogFiltersInput;
  categoryId: string;
  catalogListRef: React.RefObject<HTMLDivElement | null>;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}

export function useProductCatalogData({
  isOpen,
  mode,
  filters,
  categoryId,
  catalogListRef,
  loadMoreRef,
}: UseProductCatalogDataParams) {
  const metadataQuery = useQuery({
    queryKey: ['customer-support-catalog-metadata', ...supportCatalogCacheContext()],
    queryFn: ({ signal }) => fetchSupportCatalogMetadata(signal),
    enabled: isOpen,
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME,
    retry: 1,
  });

  const categories = (metadataQuery.data?.categories || []) as CategoryOption[];
  const relations = (metadataQuery.data?.relations || []) as CategoryRelation[];
  const flattenedCategories = useMemo(
    () => flattenCategories(categories, relations),
    [categories, relations],
  );
  const selectedCategory = categories.find((category) => category.id === categoryId);

  const catalogQuery = useInfiniteQuery({
    queryKey: [
      'customer-support-catalog-products',
      ...supportCatalogCacheContext(),
      metadataQuery.data?.userId || 'anonymous',
      filters.categoryId,
      filters.search,
      filters.brand,
    ],
    queryFn: ({ pageParam, signal }) =>
      fetchSupportCatalogPage(filters, Number(pageParam), signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.totalCount
        ? lastPage.page + 1
        : undefined,
    enabled: isOpen && mode === 'picker' && Boolean(metadataQuery.data),
    staleTime: CACHE_TIME,
    gcTime: CACHE_TIME,
    retry: 1,
  });

  const pages = catalogQuery.data?.pages || [];
  const products: SupportCatalogProduct[] = useMemo(
    () => pages.flatMap((result) => result.products),
    [pages],
  );
  const total = pages[0]?.totalCount || 0;
  const isLoading = metadataQuery.isLoading || catalogQuery.isLoading;
  const isLoadingNext = catalogQuery.isFetchingNextPage;
  const metadataError = metadataQuery.isError
    ? 'Não foi possível carregar as categorias. Tente atualizar.'
    : '';
  const catalogError = catalogQuery.isError
    ? 'Não foi possível carregar os produtos. Tente novamente.'
    : '';

  const variationProductBatches = useMemo(() => {
    return pages.flatMap((page) => {
      const productIds = page.products
        .filter((product) => product.hasVariations)
        .map((product) => product.id);
      return productIds.length ? [productIds] : [];
    });
  }, [pages]);

  const productDetailsQueries = useQueries({
    queries: variationProductBatches.map((productIds) => ({
      queryKey: [
        'customer-support-catalog-product-details',
        ...supportCatalogCacheContext(),
        metadataQuery.data?.userId || 'anonymous',
        productIds,
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchSupportCatalogProductDetails(productIds, signal),
      enabled: isOpen && mode === 'picker',
      staleTime: CACHE_TIME,
      gcTime: CACHE_TIME,
      retry: 1,
    })),
  });

  const productDetailsById = useMemo(
    () =>
      new Map<string, SupportCatalogProductDetails>(
        productDetailsQueries
          .flatMap((query) => query.data || [])
          .map((details) => [details.productId, details] as const),
      ),
    [productDetailsQueries],
  );

  const hasProductDetailsError = productDetailsQueries.some((query) => query.isError);

  useEffect(() => {
    const root = catalogListRef.current;
    const target = loadMoreRef.current;
    if (
      !isOpen ||
      mode !== 'picker' ||
      !root ||
      !target ||
      !catalogQuery.hasNextPage ||
      isLoadingNext
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void catalogQuery.fetchNextPage({ cancelRefetch: false });
        }
      },
      { root, rootMargin: '180px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    isOpen,
    mode,
    catalogQuery.hasNextPage,
    catalogQuery.fetchNextPage,
    isLoadingNext,
    catalogListRef,
    loadMoreRef,
  ]);

  return {
    metadataQuery,
    catalogQuery,
    categories,
    relations,
    flattenedCategories,
    selectedCategory,
    products,
    total,
    isLoading,
    isLoadingNext,
    metadataError,
    catalogError,
    variationProductBatches,
    productDetailsQueries,
    productDetailsById,
    hasProductDetailsError,
  };
}
