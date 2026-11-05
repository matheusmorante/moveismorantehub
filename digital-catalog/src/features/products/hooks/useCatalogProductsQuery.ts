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
} from '../product-search-suggestions';
import { getCachedStoreStyleSettings, invalidateStoreStyleSettings } from '@/lib/store-settings-cache';
import { catalogCategoriesQuery } from '@/lib/catalog-menu-queries';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';

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
        invalidateStoreStyleSettings();
        queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
        queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
        queryClient.invalidateQueries({ queryKey: ['catalog-category-relationships'] });
        queryClient.invalidateQueries({ queryKey: ['catalog-environment-categories'] });
        queryClient.invalidateQueries({ queryKey: ['catalog-opportunities'] });
      }
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [queryClient]);

  const { data: dbCategoriesList = [] } = useQuery(catalogCategoriesQuery);

  const {
    data: catalogData,
    isLoading: loading,
    isError: hasLoadError,
  } = useQuery({
    queryKey: [
      'catalog-products',
      currentPage,
      debouncedSearch,
      filters?.minPrice ?? 0,
      filters?.maxPrice ?? 10000,
      filters?.type || 'all',
      filters?.sortBy || 'newest',
      [...(filters?.envs || [])].sort(),
      [...(filters?.cats || [])].sort(),
    ],
    queryFn: async ({ signal }) => {
      if (debouncedSearch.trim() && !isCatalogSearchLongEnough(debouncedSearch)) {
        return { results: [], total: 0, cardStyle: null };
      }

      let allowedCategoryIds: string[] = [];

      if (filters?.envs && filters.envs.length > 0) {
        const { data: rels, error: relationshipError } = await queryClient.fetchQuery({
          queryKey: ['catalog-environment-categories', filters.envs], staleTime: 10 * 60 * 1000,
          queryFn: () => withAbortTimeout(supabase
          .from('category_relationships')
          .select('child_id')
          .in('parent_id', filters.envs!), 'catalogo:categorias-ambiente', 15_000),
        });
        if (relationshipError) throw relationshipError;

        allowedCategoryIds = [...filters.envs, ...(rels?.map((r) => r.child_id) || [])];
      }

      let resolvedOppId = filters?.type || 'all';
      if (resolvedOppId === 'promocao') resolvedOppId = 'promotion';
      if (
        resolvedOppId &&
        resolvedOppId !== 'all' &&
        resolvedOppId !== 'salvados' &&
        resolvedOppId !== 'promotion'
      ) {
        const { data: dbOpps, error: opportunityError } = await queryClient.fetchQuery({
          queryKey: ['catalog-opportunities'], staleTime: 10 * 60 * 1000,
          queryFn: () => withAbortTimeout(supabase.from('opportunities').select('id, name, slug'), 'catalogo:oportunidades', 15_000),
        });
        if (opportunityError) throw opportunityError;
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

      const searchTerm = isCatalogSearchLongEnough(debouncedSearch) ? debouncedSearch.trim() : '';

      const stylePromise = getCachedStoreStyleSettings();
      const { data: page, error } = await withAbortTimeout(supabase.rpc('catalog_product_card_page', {
        p_search: searchTerm,
        p_category_ids: filters?.cats?.length ? filters.cats : null,
        p_environment_category_ids: allowedCategoryIds.length ? allowedCategoryIds : null,
        p_type: resolvedOppId,
        p_min_price: filters?.minPrice ?? 0,
        p_max_price: filters?.maxPrice ?? 10000,
        p_page: currentPage,
        p_page_size: ITEMS_PER_PAGE,
        p_sort_by: filters?.sortBy || 'newest',
      }), 'catalogo:vitrine', 15_000, signal);
      if (error) throw error;
      if (!Array.isArray(page?.products) || !Number.isFinite(Number(page?.total))) {
        throw new Error('Não foi possível carregar a vitrine.');
      }
      const rawProducts = page.products;
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

      const total = Number(page.total);
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
