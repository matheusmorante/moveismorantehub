'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { ProductCard } from './product-card';
import { ProductGridPagination } from './ProductGridPagination';
import { ProductGridEmptyState } from './ProductGridEmptyState';
import { useAdminMode } from '@/hooks/use-admin-mode';
import {
  productGridMinCardWidths,
  productGridStyleClasses,
} from '@/lib/product-card-style';
import { cn } from '@/lib/utils';
import {
  useCatalogProductsQuery,
  CatalogFilters,
  ITEMS_PER_PAGE,
} from '../hooks/useCatalogProductsQuery';
import { useCatalogProductsFiltering } from '../hooks/useCatalogProductsFiltering';

interface ProductGridProps {
  filters?: CatalogFilters;
}

/**
 * Grid de produtos da loja virtual do catálogo digital.
 * Coordenador declarativo que conecta query de produtos, filtragem local e paginação.
 */
export function ProductGrid({ filters }: ProductGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { isAdminMode } = useAdminMode();
  const gridRef = useRef<HTMLDivElement>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(filters?.search || '');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters?.search || ''), 300);
    return () => clearTimeout(timer);
  }, [filters?.search]);

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

  // 1. Busca remota no banco com RPC, compatibilidade de schema e cache
  const {
    catalogData,
    loading,
    hasLoadError,
    dbCategoriesList,
    cardStyle,
    queryClient,
  } = useCatalogProductsQuery(filters, currentPage, debouncedSearch);

  const rawDbProducts = catalogData?.results || [];
  const totalProducts = catalogData?.total || 0;

  // 2. Refinamento de filtros e ordenação local
  const { allProducts } = useCatalogProductsFiltering({
    rawDbProducts,
    filters,
    dbCategoriesList,
    debouncedSearch,
  });

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
          onClick={() => queryClient.invalidateQueries({ queryKey: ['catalog-products'] })}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (allProducts.length === 0) {
    return <ProductGridEmptyState isAdminMode={isAdminMode} />;
  }

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE) || 1;

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
  const columnsClass =
    typeof configuredColumns === 'number' ? '' : productGridStyleClasses.columns[configuredColumns];
  const gridTemplateColumns = (() => {
    if (typeof configuredColumns === 'number') {
      const numericColumnLimit = Math.min(6, Math.max(2, Math.floor(configuredColumns)));
      return `repeat(auto-fill, minmax(max(${productGridMinCardWidths.comfortable}, calc((100% - ${(numericColumnLimit - 1) * 2}rem) / ${numericColumnLimit})), 1fr))`;
    }

    return `repeat(auto-fill, minmax(min(100%, ${productGridMinCardWidths[configuredColumns]}), 1fr))`;
  })();
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
        {allProducts.map((product) => {
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

      <ProductGridPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalProducts={totalProducts}
        itemsPerPage={ITEMS_PER_PAGE}
        currentCount={allProducts.length}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
