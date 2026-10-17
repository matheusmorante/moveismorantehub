'use client';

import { useState, useEffect } from 'react';
import { slugifyText } from '@/lib/slug-utils';
import { isCatalogSearchLongEnough } from '../product-search-suggestions';
import {
  normalizeSearch,
  matchesEnvironmentKeywords,
} from '../utils/productSearchSynonyms';
import type { CatalogFilters } from './useCatalogProductsQuery';

interface UseCatalogProductsFilteringOptions {
  rawDbProducts: any[];
  filters?: CatalogFilters;
  dbCategoriesList: any[];
  debouncedSearch: string;
}

/**
 * Hook de domínio responsável pelo refinamento local dos produtos carregados
 * (faixa de preço, tipo de oportunidade/salvados, sinônimos de ambiente e relacionamento de categorias).
 */
export function useCatalogProductsFiltering({
  rawDbProducts,
  filters,
  dbCategoriesList,
  debouncedSearch,
}: UseCatalogProductsFilteringOptions) {
  const [allProducts, setAllProducts] = useState<any[]>([]);

  useEffect(() => {
    if (rawDbProducts.length === 0) {
      setAllProducts([]);
      return;
    }

    let filtered = [...rawDbProducts];
    const isServerSearch = isCatalogSearchLongEnough(debouncedSearch);

    // Filtros de faixa de preço
    if (filters?.minPrice !== undefined) {
      filtered = filtered.filter((p) => (p.promo_price || p.price) >= filters.minPrice!);
    }
    if (filters?.maxPrice !== undefined) {
      filtered = filtered.filter((p) => (p.promo_price || p.price) <= filters.maxPrice!);
    }

    const SALVADOS_OPP_ID = '9d8bedae-b366-4f8c-ac49-74b85b882bde';
    const typeFilter = filters?.type || 'all';

    if (!isServerSearch && (typeFilter === 'salvados' || typeFilter === SALVADOS_OPP_ID)) {
      filtered = filtered.filter(
        (p) => p.opportunity_id === SALVADOS_OPP_ID || p.opportunities?.name === 'Salvados'
      );
    } else if (!isServerSearch && (typeFilter === 'promotion' || typeFilter === 'promocao')) {
      filtered = filtered.filter((p) => p.promo_price != null);
    } else if (!isServerSearch && typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(
        (p) =>
          p.opportunity_id === typeFilter ||
          p.opportunities?.slug === typeFilter ||
          (p.opportunities && slugifyText(p.opportunities.name) === slugifyText(typeFilter))
      );
    }

    const sort = filters?.sortBy || 'newest';
    if (!isServerSearch && sort === 'price-asc')
      filtered.sort((a, b) => (a.promo_price || a.price || 0) - (b.promo_price || b.price || 0));
    if (!isServerSearch && sort === 'price-desc')
      filtered.sort((a, b) => (b.promo_price || b.price || 0) - (a.promo_price || a.price || 0));
    if (!isServerSearch && sort === 'title-asc')
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Filtro por ambiente baseado em categorias e sinônimos
    if (!isServerSearch && filters?.envs && filters.envs.length > 0) {
      const envCategoryNames = (dbCategoriesList || [])
        .filter((c) => filters.envs!.includes(c.id))
        .map((c) => normalizeSearch(c.name));

      filtered = filtered.filter((p) => {
        const prodCatIds =
          p.product_categories?.map((pc: any) => pc.category_id).filter(Boolean) || [];
        if (prodCatIds.some((catId: string) => filters.envs!.includes(catId))) {
          return true;
        }

        const cleanName = normalizeSearch(p.name || '');
        const cleanDesc = normalizeSearch(p.description || '');
        const fullText = `${cleanName} ${cleanDesc}`;

        return matchesEnvironmentKeywords(fullText, envCategoryNames);
      });
    }

    // Filtro por categorias com suporte a ID, slug e normalização fonética/plural
    if (!isServerSearch && filters?.cats && filters.cats.length > 0) {
      const allCatTargetIds = new Set<string>();

      filters.cats.forEach((catItem: string) => {
        if (!catItem) return;
        const itemClean = catItem.toLowerCase().trim();
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(catItem)
        ) {
          allCatTargetIds.add(catItem);
        }

        const matchedCats = (dbCategoriesList || []).filter((c) => {
          if (c.type !== 'category') return false;

          const cId = String(c.id).toLowerCase().trim();
          const cSlug = (c.slug || '').toLowerCase().trim();
          const genSlug = slugifyText(c.name);
          const normName = normalizeSearch(c.name);
          const normItem = normalizeSearch(catItem);

          return (
            cId === itemClean ||
            cSlug === itemClean ||
            genSlug === itemClean ||
            (cSlug && cSlug.replace(/s$/, '') === itemClean.replace(/s$/, '')) ||
            genSlug.replace(/s$/, '') === itemClean.replace(/s$/, '') ||
            normName === normItem ||
            normName.replace(/s$/, '') === normItem.replace(/s$/, '')
          );
        });

        matchedCats.forEach((matchedCat) => {
          allCatTargetIds.add(matchedCat.id);
        });
      });

      if (allCatTargetIds.size === 0) {
        filtered = [];
      } else {
        filtered = filtered.filter((product) => {
          const productCategoryIds =
            product.product_categories?.map((link: any) => link.category_id).filter(Boolean) || [];
          return productCategoryIds.some((categoryId: string) => allCatTargetIds.has(categoryId));
        });
      }
    }

    setAllProducts(filtered);
  }, [filters, rawDbProducts, dbCategoriesList, debouncedSearch]);

  return { allProducts };
}
