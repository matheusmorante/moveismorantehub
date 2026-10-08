import React, { forwardRef, useImperativeHandle } from 'react';
import ProductTable from './components/Table/ProductTable';
import { useProducts } from './hooks/data/useProducts';
import { useVariationExitFlags } from './hooks/data/useVariationExitFlags';
import Product, { ProductVisibilitySettings } from '../../../types/product.type';
import type { ProductCategoryTree, ProductListFilters } from './types';
import { toast } from 'react-toastify';
import { FixedPageSlots } from '@/components/shared/FixedPageSlots';

interface ProductListProps {
  mode?: 'standard' | 'composition';
  readOnly?: boolean;
  onEdit: (product: Product) => void;
  onShowHistory?: (product: Product) => void;
  onLaunchStock?: (product: Product) => void;
  filters?: ProductListFilters;
  visibilitySettings: ProductVisibilitySettings;
  onToggleColumn: (column: keyof ProductVisibilitySettings) => void;
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  categoryTree?: ProductCategoryTree;
  title?: string;
  onCloseTrash?: () => void;
  onRefresh?: () => void;
  onDuplicate?: (product: Product) => void;
}

export interface ProductListRef {
  refresh: () => void;
}

const ProductList = forwardRef<ProductListRef, ProductListProps>(
  (
    {
      mode = 'standard',
      readOnly = false,
      onEdit,
      onShowHistory,
      onLaunchStock,
      filters,
      visibilitySettings,
      onToggleColumn,
      onSort,
      categoryTree,
      title,
      onCloseTrash,
      onRefresh,
      onDuplicate,
    },
    ref
  ) => {
    const listFilters = React.useMemo(
      () => ({
        ...filters,
        // Produtos desativados não devem ser ocultados da lista:
        includeDeactivated: filters?.activeOnly === true ? false : true,
        includeMergedVariations: true,
        itemType: mode === 'composition' ? 'composition' : filters?.itemType,
        excludeItemType: mode === 'standard' && !filters?.itemType ? 'composition' : undefined,
      }),
      [filters, mode]
    );

    const {
      products,
      paginatedProducts,
      loading,
      isServerPagination,
      totalItems,
      currentPage,
      itemsPerPage,
      totalPages,
      setCurrentPage,
      setItemsPerPage,
      handleDelete,
      handleRestore,
      handlePermanentDelete,
      selectedProducts,
      toggleSelection,
      selectAll,
      clearSelection,
      handleBulkTrash,
      handleBulkRestore,
      handleBulkPermanentDelete,
      toggleActive,
      deactivateCatalog,
      refresh,
    } = useProducts(listFilters);

    const { exitedVariationIds } = useVariationExitFlags();

    // Auto-scroll to top when page changes
    React.useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
      scrollContainers.forEach((el) => {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }, [currentPage]);

    useImperativeHandle(ref, () => ({
      refresh,
    }));

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            Sincronizando catálogo...
          </p>
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
            <i className="bi bi-box-seam text-4xl text-slate-200 dark:text-slate-800"></i>
          </div>
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 font-bold">Nenhum item encontrado</p>
            <p className="text-slate-400 dark:text-slate-600 text-xs">
              Tente ajustar seus filtros ou adicione um novo produto ou serviço.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        {(title || onCloseTrash) && (
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {title && (
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  {title}
                </h2>
              )}
              {products.length > 0 && (
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                  {totalItems} itens
                </span>
              )}
            </div>
            {onCloseTrash && (
              <button
                onClick={onCloseTrash}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-xl transition-all"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
        )}
        <div className="p-0.5 sm:p-2 lg:p-4">
          <ProductTable
            products={paginatedProducts}
            readOnly={readOnly}
            onEdit={onEdit}
            onShowHistory={onShowHistory}
            onLaunchStock={onLaunchStock}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onToggleActive={toggleActive}
            onDeactivateCatalog={deactivateCatalog}
            visibilitySettings={visibilitySettings}
            onToggleColumn={onToggleColumn}
            showTrash={listFilters.showTrash}
            filters={listFilters}
            onSort={onSort}
            selectedProducts={selectedProducts}
            onToggleSelection={toggleSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkTrash={handleBulkTrash}
            onBulkRestore={handleBulkRestore}
            onBulkPermanentDelete={handleBulkPermanentDelete}
            categoryTree={categoryTree}
            onRefresh={() => {
              refresh();
              onRefresh?.();
            }}
            onDuplicate={onDuplicate}
            exitedVariationIds={exitedVariationIds}
          />

          {/* Pagination */}
          <div className="mt-8 flex items-center justify-between flex-wrap gap-4 border-t border-slate-50 dark:border-slate-800 pt-6">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest flex items-center gap-2">
                {isServerPagination ? (
                  <>
                    {loading && (
                      <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    )}
                    Página {currentPage} · {totalItems} itens no catálogo
                  </>
                ) : (
                  `Exibindo ${paginatedProducts.length} de ${totalItems} itens`
                )}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-400 focus:outline-none"
                >
                  {(isServerPagination ? [10, 15] : [10, 15]).map((size) => (
                    <option key={size} value={size}>
                      {size} por página
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <FixedPageSlots
              ariaLabel="Paginação de produtos"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              loading={loading}
            />
          </div>
        </div>
      </div>
    );
  }
);

export default ProductList;
