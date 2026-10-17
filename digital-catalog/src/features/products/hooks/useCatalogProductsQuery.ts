'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import {
  defaultStoreDesignSettings,
  StoreDesignSettings,
} from '@/lib/product-card-style';
import { slugifyText } from '@/lib/slug-utils';
import { hasPublicCatalogItem, isPublicCatalogVariation } from '../product-visibility';
import {
  CATALOG_PRODUCT_PAGE_SIZE,
  isCatalogSearchLongEnough,
  orderCatalogSearchResultsByIds,
} from '../product-search-suggestions';
import { getCachedStoreStyleSettings } from '@/lib/store-settings-cache';

export interface CatalogFilters {
  envs?: string[];
  cats?: string[];
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  type?: string;
  sortBy?: string;
}

export const ITEMS_PER_PAGE = CATALOG_PRODUCT_PAGE_SIZE;

/**
 * Hook responsável pela busca remota de produtos no catálogo digital com RPC,
 * compatibilidade de schemas legados, cache de estilos de loja e sincronização via BroadcastChannel.
 */
export function useCatalogProductsQuery(filters: CatalogFilters | undefined, currentPage: number, debouncedSearch: string) {
  const queryClient = useQueryClient();
  const [cardStyle, setCardStyle] = useState<StoreDesignSettings>(defaultStoreDesignSettings);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('catalog-updates');
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'catalog-updated') {
        queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
        queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
      }
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [queryClient]);

  const { data: dbCategoriesList = [] } = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name, slug, type');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const {
    data: catalogData,
    isLoading: loading,
    isError: hasLoadError,
  } = useQuery({
    queryKey: [
      'catalog-products',
      currentPage,
      debouncedSearch,
      filters?.minPrice,
      filters?.maxPrice,
      filters?.type,
      filters?.sortBy,
      filters?.envs,
      filters?.cats,
    ],
    queryFn: async () => {
      if (debouncedSearch.trim() && !isCatalogSearchLongEnough(debouncedSearch)) {
        return { results: [], total: 0, cardStyle: null };
      }

      let allowedCategoryIds: string[] = [];

      if (filters?.envs && filters.envs.length > 0) {
        const { data: rels } = await supabase
          .from('category_relationships')
          .select('child_id')
          .in('parent_id', filters.envs);

        allowedCategoryIds = [...filters.envs, ...(rels?.map((r) => r.child_id) || [])];
      }

      let resolvedOppId = filters?.type || 'all';
      if (
        resolvedOppId &&
        resolvedOppId !== 'all' &&
        resolvedOppId !== 'salvados' &&
        resolvedOppId !== 'promotion'
      ) {
        const { data: dbOpps } = await supabase.from('opportunities').select('id, name, slug');
        if (dbOpps) {
          const matchedOpp = dbOpps.find(
            (o: any) =>
              o.id === resolvedOppId ||
              (o.slug && o.slug.toLowerCase().trim() === resolvedOppId.toLowerCase().trim()) ||
              slugifyText(o.name) === slugifyText(resolvedOppId)
          );
          if (matchedOpp) resolvedOppId = matchedOpp.id;
        }
      }

      const selectedCategoryIds = Array.from(
        new Set([...(filters?.cats || []), ...allowedCategoryIds].filter(Boolean))
      );
      const searchTerm = isCatalogSearchLongEnough(debouncedSearch) ? debouncedSearch.trim() : '';

      let searchProductIds: string[] | null = null;
      let searchResultCount: number | null = null;
      if (searchTerm) {
        const { data: searchRows, error: searchError } = await supabase.rpc(
          'search_catalog_product_page',
          {
            p_search: searchTerm,
            p_category_ids: filters?.cats?.length ? filters.cats : null,
            p_environment_category_ids: allowedCategoryIds.length ? allowedCategoryIds : null,
            p_type: resolvedOppId,
            p_min_price: filters?.minPrice ?? 0,
            p_max_price: filters?.maxPrice ?? 10000,
            p_page: currentPage,
            p_page_size: ITEMS_PER_PAGE,
            p_sort_by: filters?.sortBy || 'newest',
          }
        );
        if (searchError) throw searchError;
        searchProductIds = (searchRows || []).map(
          (row: { product_id: string }) => row.product_id
        );
        searchResultCount = Number(searchRows?.[0]?.total_count || 0);
      }

      function buildProductsQuery(
        hasDeletedAt: boolean,
        hasOpportunities: boolean,
        productIds?: string[]
      ) {
        let q: any = supabase.from('products');

        const productCategoriesSelect = productIds
          ? 'product_categories(category_id, categories(name))'
          : selectedCategoryIds.length > 0
            ? 'product_categories!inner(category_id, categories(name))'
            : 'product_categories(category_id, categories(name))';
        const selColumns =
          `
          id, name, slug, price, promo_price, description, code, opportunity_id, is_salvado, status,
          product_images(image_url, is_main),
          product_variations(id, name, sku, price, promo_price, image_url, attributes, use_parent_price, use_parent_promo_price, use_parent_name, status, active),
          ${productCategoriesSelect}
        ` +
          (hasOpportunities
            ? `, opportunities(name, slug, badge_color, border_color, border_style, badge_animation, title_color)`
            : ``);

        q = q.select(selColumns, { count: 'exact' });
        q = q.eq('status', 'published');

        if (hasDeletedAt) {
          q = q.is('deleted_at', null);
        }

        if (productIds) {
          q = q.in('id', productIds);
        }

        if (!productIds && selectedCategoryIds.length > 0) {
          q = q.in('product_categories.category_id', selectedCategoryIds);
        }

        if (!productIds && resolvedOppId === 'salvados') {
          q = q.eq('is_salvado', true);
        } else if (!productIds && resolvedOppId === 'promotion') {
          q = q.not('promo_price', 'is', null);
        } else if (!productIds && resolvedOppId && resolvedOppId !== 'all') {
          q = q.eq('opportunity_id', resolvedOppId);
        }

        if (!productIds && (filters?.minPrice ?? 0) > 0) q = q.gte('price', filters!.minPrice);
        if (!productIds && (filters?.maxPrice ?? 10000) < 10000)
          q = q.lte('price', filters!.maxPrice);

        const sortBy = filters?.sortBy || 'newest';
        if (sortBy === 'price-asc') q = q.order('price', { ascending: true });
        else if (sortBy === 'price-desc') q = q.order('price', { ascending: false });
        else if (sortBy === 'title-asc') q = q.order('name', { ascending: true });
        else q = q.order('created_at', { ascending: false });

        if (productIds) return q;
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        return q.range(from, from + ITEMS_PER_PAGE - 1);
      }

      const stylePromise = getCachedStoreStyleSettings();

      let hasDeletedAt = true;
      let hasOpportunities = true;
      let data: any[] | null = null;
      let error: any = null;
      let count: number | null = null;
      if (searchProductIds) {
        count = searchResultCount;
        if (searchProductIds.length > 0) {
          const result = await buildProductsQuery(
            hasDeletedAt,
            hasOpportunities,
            searchProductIds
          );
          data = result.data;
          error = result.error;
        } else {
          data = [];
        }
      } else {
        const result = await buildProductsQuery(hasDeletedAt, hasOpportunities);
        data = result.data;
        error = result.error;
        count = result.count;
      }

      if (error) {
        console.warn(
          'Erro ao buscar produtos, tentando com fallback de compatibilidade de schema:',
          error
        );

        if (error.code === '42703' && error.message?.includes('deleted_at')) {
          hasDeletedAt = false;
        }
        if (error.code === '42P01' && error.message?.includes('opportunities')) {
          hasOpportunities = false;
        }

        const secondAttempt = await buildProductsQuery(
          hasDeletedAt,
          hasOpportunities,
          searchProductIds !== null ? searchProductIds : undefined
        );

        if (secondAttempt.error) {
          if (secondAttempt.error.code === '42703' || secondAttempt.error.code === '42P01') {
            const thirdAttempt = await buildProductsQuery(
              false,
              false,
              searchProductIds !== null ? searchProductIds : undefined
            );
            if (thirdAttempt.error) throw thirdAttempt.error;
            data = thirdAttempt.data;
            count = thirdAttempt.count;
            hasOpportunities = false;
          } else {
            throw secondAttempt.error;
          }
        } else {
          data = secondAttempt.data;
          count = secondAttempt.count;
        }
      }

      const rawProducts = searchProductIds
        ? orderCatalogSearchResultsByIds(data || [], searchProductIds)
        : data || [];
      let results: any[] = [];

      for (const p of rawProducts) {
        if (!hasPublicCatalogItem(p)) continue;
        const allVariations = p.product_variations || [];
        const variations =
          p.product_variations?.filter((v: any) => isPublicCatalogVariation(v)) || [];

        const finalOpportunities =
          p.opportunities ||
          (p.is_salvado
            ? {
                name: 'Salvados',
                badge_color: 'bg-red-600',
                border_color: 'border-orange-500',
                border_style: 'solid',
                badge_animation: 'pulse',
              }
            : null);

        const mappedProduct = {
          ...p,
          opportunities: finalOpportunities,
        };

        if (allVariations.length > 0) {
          for (const v of variations) {
            const varPrice =
              v.use_parent_price === false && v.price ? parseFloat(v.price) : p.price;
            const varPromoPrice =
              v.use_parent_promo_price === false && v.promo_price
                ? parseFloat(v.promo_price)
                : p.promo_price;
            const varImg =
              (v.image_url && v.image_url.includes(',')
                ? v.image_url.split(',')[0]
                : v.image_url) ||
              p.product_images?.find((img: any) => img.is_main)?.image_url ||
              p.product_images?.[0]?.image_url;

            const isParentName = v.use_parent_name !== false;
            const comboName = Object.values(v.attributes || {})
              .map((attributeValue: any) => {
                if (attributeValue === null || attributeValue === undefined) return '';
                if (typeof attributeValue === 'object') {
                  return String(
                    attributeValue.value ?? attributeValue.label ?? attributeValue.name ?? ''
                  );
                }
                return String(attributeValue);
              })
              .filter(Boolean)
              .join(' / ');

            const displayName =
              !isParentName && v.name
                ? v.name
                : v.name || (comboName ? `${p.name} - ${comboName}` : p.name);

            results.push({
              ...mappedProduct,
              id: `${p.id}-${v.id}`,
              realProductId: p.id,
              name: displayName,
              sku: v.sku || p.code || '',
              price: varPrice,
              promo_price: varPromoPrice,
              image_url: varImg,
              slug: `${p.slug}?var=${v.id}`,
              is_variation: true,
            });
          }
        } else {
          results.push(mappedProduct);
        }
      }

      const { data: styleData, error: styleError } = await stylePromise;
      let loadedCardStyle = null;
      if (!styleError && styleData) {
        loadedCardStyle = { ...defaultStoreDesignSettings, ...styleData } as StoreDesignSettings;
      }

      const total = searchProductIds ? searchResultCount || 0 : count || 0;
      return { results, total, cardStyle: loadedCardStyle };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (catalogData?.cardStyle) {
      setCardStyle(catalogData.cardStyle);
    }
  }, [catalogData?.cardStyle]);

  return {
    catalogData,
    loading,
    hasLoadError,
    dbCategoriesList,
    cardStyle,
    queryClient,
  };
}
