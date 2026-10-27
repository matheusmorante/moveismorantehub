import React, { forwardRef, useImperativeHandle } from 'react';
import ProductTable from './components/Table/ProductTable';
import { useProducts } from './hooks/data/useProducts';
import Product, { ProductVisibilitySettings } from '../../../types/product.type';
import type { ProductCategoryTree, ProductListFilters } from './types';
import { ERPListPagination } from '@/components/shared/ERPListPagination';
import { MoveProductToTrashModal } from './modals/MoveProductToTrashModal';

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
  onTestDataAvailabilityChange?: (hasTestData: boolean) => void;
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
      onTestDataAvailabilityChange,
    },
    ref
  ) => {
    const listFilters = React.useMemo(
      () => ({
        ...filters,
        // Produtos desativados não devem ser ocultados da lista:
        includeDeactivated: filters?.activeOnly === true ? false : true,
        includeMergedVariations: Boolean(filters?.includeMergedVariations),
        itemType: mode === 'composition' ? 'composition' : filters?.itemType,
      }),
      [filters, mode]
    );

    const {
      products,
      paginatedProducts,
      hasTestProducts,
      loading,
      error,
      canDeleteProducts,
      totalItems,
      currentPage,
      itemsPerPage,
      setCurrentPage,
      handleItemsPerPageChange,
      handleDelete,
      handleRestore,
      handleMoveToTrash,
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

    const [trashModalProduct, setTrashModalProduct] = React.useState<Product | null>(null);
    const [isTrashing, setIsTrashing] = React.useState(false);

    React.useEffect(() => {
      onTestDataAvailabilityChange?.(!loading && hasTestProducts);
    }, [hasTestProducts, loading, onTestDataAvailabilityChange]);

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

    const pagination = (
      <ERPListPagination
        ariaLabel="Paginação de produtos"
        page={currentPage}
        pageSize={itemsPerPage}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => handleItemsPerPageChange(size as Parameters<typeof handleItemsPerPageChange>[0])}
        preferenceKey={`products:${mode}`}
        itemLabel="itens"
        loading={loading}
        className="mt-4"
      />
    );

    if (loading) {
      return (
        <div className="flex flex-col">
          <div className="flex min-h-80 flex-col items-center justify-center gap-4 py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              Sincronizando catálogo...
            </p>
          </div>
          {pagination}
        </div>
      );
    }

    if (error && products.length === 0) {
      const errorMessage =
        error instanceof Error && error.name === 'ProductVariationSearchTooBroadError'
          ? error.message
          : 'Não foi possível carregar os produtos.';
      return (
        <div role="alert" className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <p className="font-bold text-red-600">{errorMessage}</p>
          <button onClick={refresh} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">
            Tentar novamente
          </button>
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
        <div className={title || onCloseTrash ? 'p-0.5 sm:p-2 lg:p-4' : 'px-0.5 sm:px-1'}>
          <ProductTable
            products={paginatedProducts}
            readOnly={readOnly}
            canDeleteProducts={canDeleteProducts}
            onEdit={onEdit}
            onShowHistory={onShowHistory}
            onLaunchStock={onLaunchStock}
            onDelete={async (id) => {
              await handleDelete(id);
              onRefresh?.();
            }}
            onRestore={async (id) => {
              await handleRestore(id);
              onRefresh?.();
            }}
            onMoveToTrash={(product) => setTrashModalProduct(product)}
            onPermanentDelete={async (id) => {
              await handlePermanentDelete(id);
              onRefresh?.();
            }}
            onToggleActive={async (id, currentStatus) => {
              await toggleActive(id, currentStatus);
              onRefresh?.();
            }}
            onDeactivateCatalog={async (id) => {
              await deactivateCatalog(id);
              onRefresh?.();
            }}
            visibilitySettings={visibilitySettings}
            onToggleColumn={onToggleColumn}
            showTrash={listFilters.showTrash}
            filters={listFilters}
            onSort={onSort}
            selectedProducts={selectedProducts}
            onToggleSelection={toggleSelection}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onBulkTrash={async () => {
              await handleBulkTrash();
              onRefresh?.();
            }}
            onBulkRestore={async () => {
              await handleBulkRestore();
              onRefresh?.();
            }}
            onBulkPermanentDelete={async () => {
              await handleBulkPermanentDelete();
              onRefresh?.();
            }}
            categoryTree={categoryTree}
            onRefresh={() => {
              refresh();
              onRefresh?.();
            }}
            onDuplicate={onDuplicate}
          />

          {pagination}
        </div>

        <MoveProductToTrashModal
          isOpen={Boolean(trashModalProduct)}
          product={trashModalProduct}
          isLoading={isTrashing}
          onClose={() => {
            if (!isTrashing) setTrashModalProduct(null);
          }}
          onConfirm={async () => {
            if (!trashModalProduct) return;
            setIsTrashing(true);
            try {
              await handleMoveToTrash(trashModalProduct);
              setTrashModalProduct(null);
              onRefresh?.();
            } finally {
              setIsTrashing(false);
            }
          }}
        />
      </div>
    );
  }
);

export default ProductList;
