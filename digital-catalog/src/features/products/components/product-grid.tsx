'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ProductCard } from './product-card';
import { ChevronLeft, ChevronRight, Loader2, Package } from 'lucide-react';
import { useAdminMode } from '@/hooks/use-admin-mode';
import {
  defaultStoreDesignSettings,
  productGridMinCardWidths,
  productGridStyleClasses,
  StoreDesignSettings,
} from '@/lib/product-card-style';
import { cn } from '@/lib/utils';

import { slugifyText } from '@/lib/slug-utils';
import { hasPublicCatalogItem, isPublicCatalogVariation } from '../product-visibility';
import {
  CATALOG_PRODUCT_PAGE_SIZE,
  isCatalogSearchLongEnough,
  orderCatalogSearchResultsByIds,
} from '../product-search-suggestions';
import { getCachedStoreStyleSettings } from '@/lib/store-settings-cache';

interface ProductGridProps {
  filters?: {
    envs: string[];
    cats: string[];
    search: string;
    minPrice: number;
    maxPrice: number;
    type: string;
    sortBy: string;
  };
}

const ITEMS_PER_PAGE = CATALOG_PRODUCT_PAGE_SIZE;

export function ProductGrid({ filters }: ProductGridProps) {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [rawDbProducts, setRawDbProducts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [cardStyle, setCardStyle] = useState<StoreDesignSettings>(defaultStoreDesignSettings);
  const { isAdminMode } = useAdminMode();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dbCategoriesList, setDbCategoriesList] = useState<any[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(filters?.search || '');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters?.search || ''), 300);
    return () => clearTimeout(timer);
  }, [filters?.search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('catalog-updates');
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'catalog-updated') {
        setRefreshTrigger((prev) => prev + 1);
      }
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function fetchProducts() {
      setLoading(true);
      setHasLoadError(false);
      try {
        if (debouncedSearch.trim() && !isCatalogSearchLongEnough(debouncedSearch)) {
          setRawDbProducts([]);
          setAllProducts([]);
          setTotalProducts(0);
          return;
        }

        let allowedCategoryIds: string[] = [];

        if (filters?.envs && filters.envs.length > 0) {
          const { data: rels } = await supabase
            .from('category_relationships')
            .select('child_id')
            .in('parent_id', filters.envs);

          allowedCategoryIds = [...filters.envs, ...(rels?.map((r) => r.child_id) || [])];
        }

        // Se type for um slug legível de Oportunidade, resolve para o UUID real
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
          let q = supabase.from('products');

          // Categorias são exclusivamente relacionais: um produto pode ter várias.
          // O !inner permite filtrar e paginar no servidor sem depender de category_id legado.
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
        if (!isCurrent) return;
        if (!styleError && styleData)
          setCardStyle({ ...defaultStoreDesignSettings, ...styleData } as StoreDesignSettings);

        const { data: catsList } = await supabase.from('categories').select('id, name, slug, type');
        if (!isCurrent) return;
        setDbCategoriesList(catsList || []);
        setRawDbProducts(results);
        if (results.length === 0) setAllProducts([]);
        setTotalProducts(searchProductIds ? searchResultCount || 0 : count || 0);
      } catch (error) {
        if (isCurrent) {
          console.error('Erro ao carregar produtos:', error);
          setHasLoadError(true);
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    fetchProducts();
    return () => {
      isCurrent = false;
    };
  }, [
    refreshTrigger,
    currentPage,
    debouncedSearch,
    filters?.minPrice,
    filters?.maxPrice,
    filters?.type,
    filters?.sortBy,
    filters?.envs,
    filters?.cats,
  ]);

  useEffect(() => {
    if (rawDbProducts.length === 0) return;

    let filtered = [...rawDbProducts];
    const isServerSearch = isCatalogSearchLongEnough(debouncedSearch);

    // Refazer os filtros locais que antes estavam misturados no fetch
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

    const normalizeSearch = (str: string) => {
      if (!str) return '';
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[-_/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const getSynonyms = (token: string): string[] => {
      const norm = token.toLowerCase().trim().replace(/s$/, '');
      if (norm === 'roupa' || norm === 'guarda' || norm === 'roupeiro' || norm === 'guardaroupa') {
        return [
          'roupa',
          'roupas',
          'guarda',
          'roupeiro',
          'roupeiros',
          'guarda-roupa',
          'guarda roupa',
        ];
      }
      if (norm === 'sofa' || norm === 'estofado') {
        return ['sofa', 'sofas', 'estofado', 'estofados'];
      }
      if (norm === 'colchao' || norm === 'espuma' || norm === 'mola') {
        return ['colchao', 'colchoes'];
      }
      if (norm === 'cama' || norm === 'box' || norm === 'sommier') {
        return ['cama', 'camas', 'box'];
      }
      if (norm === 'mesa') {
        return ['mesa', 'mesas'];
      }
      if (norm === 'painel') {
        return ['painel', 'paineis'];
      }
      if (norm === 'rack') {
        return ['rack', 'racks'];
      }
      if (norm === 'balcao') {
        return ['balcao', 'balcoes'];
      }
      if (norm === 'pia') {
        return ['pia', 'pias'];
      }
      if (norm === 'armario') {
        return ['armario', 'armarios'];
      }
      if (norm === 'multiuso') {
        return ['multiuso', 'multiusos'];
      }
      if (norm === 'cadeira') {
        return ['cadeira', 'cadeiras'];
      }
      if (norm === 'banqueta') {
        return ['banqueta', 'banquetas'];
      }
      if (norm === 'comoda') {
        return ['comoda', 'comodas'];
      }
      if (norm === 'cabeceira') {
        return ['cabeceira', 'cabeceiras'];
      }
      if (norm === 'sapateira') {
        return ['sapateira', 'sapateiras'];
      }
      if (norm === 'cristaleira') {
        return ['cristaleira', 'cristaleiras'];
      }
      if (norm === 'escrivaninha') {
        return ['escrivaninha', 'escrivaninhas', 'mesa'];
      }
      return [token, `${token}s`, norm];
    };

    if (!isServerSearch && filters?.envs && filters.envs.length > 0) {
      const envCategoryNames = (dbCategoriesList || [])
        .filter((c) => filters.envs.includes(c.id))
        .map((c) => normalizeSearch(c.name));

      filtered = filtered.filter((p) => {
        const prodCatIds =
          p.product_categories?.map((pc: any) => pc.category_id).filter(Boolean) || [];
        if (prodCatIds.some((catId: string) => filters.envs.includes(catId))) {
          return true;
        }

        const cleanName = normalizeSearch(p.name || '');
        const cleanDesc = normalizeSearch(p.description || '');
        const fullText = `${cleanName} ${cleanDesc}`;

        return envCategoryNames.some((envName) => {
          const tokens = envName
            .split(' ')
            .filter(
              (t) =>
                t.length >= 2 && !['de', 'da', 'do', 'dos', 'das', 'para', 'com', 'em'].includes(t)
            );
          if (tokens.length === 0) return true;
          return tokens.some((token) => {
            const syns = getSynonyms(token);
            return syns.some((syn) => fullText.includes(syn));
          });
        });
      });
    }

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

        // Tenta encontrar a categoria por ID, slug, nome ou versão sem 's' final
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

      // Categoria é um filtro exato pelos vínculos relacionais do produto.
      if (allCatTargetIds.size === 0) {
        filtered = [];
      } else {
        filtered = filtered.filter((product) => {
          const productCategoryIds =
            product.product_categories?.map((link: any) => link.category_id).filter(Boolean) || [];
          return productCategoryIds.some((categoryId) => allCatTargetIds.has(categoryId));
        });
      }
    }

    setAllProducts(filtered);
  }, [filters, rawDbProducts, dbCategoriesList, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters?.envs,
    filters?.cats,
    filters?.search,
    filters?.minPrice,
    filters?.maxPrice,
    filters?.type,
    filters?.sortBy,
  ]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full gap-4 bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium text-sm">
          Atualizando produtos...
        </p>
      </div>
    );
  }

  if (hasLoadError) {
    return (
      <div
        role="alert"
        className="text-center py-12 sm:py-20 border rounded-3xl bg-gray-50/50 border-dashed border-gray-200"
      >
        <p className="text-gray-700 font-bold text-lg">Não foi possível carregar os produtos</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
          Tente novamente em instantes.
        </p>
        <button
          type="button"
          onClick={() => setRefreshTrigger((current) => current + 1)}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (allProducts.length === 0) {
    return (
      <div className="text-center py-20 border rounded-3xl bg-gray-50/50 border-dashed border-gray-200 animate-in fade-in zoom-in duration-500">
        <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Package className="h-10 w-10 text-gray-300" />
        </div>
        <p className="text-gray-600 font-bold text-lg">Nenhum produto encontrado</p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {isAdminMode
            ? 'Certifique-se de que os produtos foram marcados como "Concluir Cadastro" no painel administrativo.'
            : 'Estamos preparando novidades incríveis para você! Tente selecionar outro filtro ou volte em alguns instantes.'}
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = allProducts;

  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages || p === currentPage) return;
    setCurrentPage(p);
    if (gridRef.current) {
      const yOffset = -90;
      const y = gridRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  const configuredColumns = cardStyle.product_grid_columns;
  const numericColumnLimit =
    typeof configuredColumns === 'number'
      ? Math.min(6, Math.max(2, Math.floor(configuredColumns)))
      : null;
  const columnsClass = numericColumnLimit
    ? ''
    : productGridStyleClasses.columns[configuredColumns];
  const gridTemplateColumns = numericColumnLimit
    ? `repeat(auto-fill, minmax(max(${productGridMinCardWidths.comfortable}, calc((100% - ${(numericColumnLimit - 1) * 2}rem) / ${numericColumnLimit})), 1fr))`
    : `repeat(auto-fill, minmax(min(100%, ${productGridMinCardWidths[configuredColumns]}), 1fr))`;
  const gapClass =
    productGridStyleClasses.gap[cardStyle.product_grid_gap] || productGridStyleClasses.gap['tight'];

  return (
    <div ref={gridRef} className="space-y-8 scroll-mt-24">
      <div
        className={cn(
          'grid animate-in fade-in slide-in-from-bottom-4 duration-700',
          columnsClass,
          gapClass
        )}
        style={gridTemplateColumns ? { gridTemplateColumns } : undefined}
      >
        {paginatedProducts.map((product) => {
          const mainImg =
            product.image_url ||
            product.product_images?.find((img: any) => img.is_main)?.image_url ||
            product.product_images?.[0]?.image_url ||
            'https://images.unsplash.com/photo-1594462250122-b2d99d3d0f3c?q=80&w=800';

          return (
            <ProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                promo_price: product.promo_price,
                category: product.product_categories?.[0]?.categories?.name || 'Móvel',
                image: mainImg,
                promotion: !!product.promo_price,
                opportunity: product.opportunities
                  ? {
                      name: product.opportunities.name,
                      slug: product.opportunities.slug,
                      badge_color: product.opportunities.badge_color,
                      border_color: product.opportunities.border_color,
                      border_style: product.opportunities.border_style,
                      badge_animation: product.opportunities.badge_animation,
                      title_color: product.opportunities.title_color,
                    }
                  : product.is_salvado
                    ? {
                        name: 'Salvados',
                        slug: 'salvado',
                        badge_color: 'bg-orange-500',
                        border_color: 'border-orange-500',
                      }
                    : null,
              }}
              style={cardStyle}
            />
          );
        })}
      </div>

      {/* Paginação Responsiva conforme a imagem */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 border-t border-gray-100 mt-8">
          <span className="text-xs font-semibold text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
            Mostrando <span className="font-bold text-gray-900">{startIndex + 1}</span> a{' '}
            <span className="font-bold text-gray-900">
              {Math.min(startIndex + paginatedProducts.length, totalProducts)}
            </span>{' '}
            de <span className="font-bold text-gray-900">{totalProducts}</span> produtos
          </span>

          <div className="flex items-center justify-center gap-1.5 md:gap-2.5 order-1 sm:order-2 select-none">
            {/* Botão Anterior (<) - Cápsula Cinza */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={cn(
                'h-10 px-3.5 md:px-4 rounded-full flex items-center justify-center transition-all text-xs font-bold gap-1',
                currentPage === 1
                  ? 'bg-gray-200/80 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer shadow-xs active:scale-95'
              )}
              title="Página Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Números das Páginas */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc: (number | string)[], pageNum, index, array) => {
                if (index > 0 && pageNum - (array[index - 1] as number) > 1) {
                  acc.push('...');
                }
                acc.push(pageNum);
                return acc;
              }, [])
              .map((p, idx) => {
                if (p === '...') {
                  return (
                    <span
                      key={`dots-${idx}`}
                      className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-400"
                    >
                      ...
                    </span>
                  );
                }

                const isCurrent = p === currentPage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePageChange(p as number)}
                    className={cn(
                      'w-9 h-9 md:w-10 md:h-10 rounded-full font-black text-sm flex items-center justify-center transition-all cursor-pointer',
                      isCurrent
                        ? 'bg-[#004687] text-white shadow-md scale-105'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-primary font-bold'
                    )}
                  >
                    {p}
                  </button>
                );
              })}

            {/* Botão Próximo (>) */}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={cn(
                'h-10 px-3.5 md:px-4 rounded-full flex items-center justify-center transition-all text-xs font-bold gap-1',
                currentPage === totalPages
                  ? 'bg-gray-200/80 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800 cursor-pointer shadow-xs active:scale-95'
              )}
              title="Próxima Página"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
