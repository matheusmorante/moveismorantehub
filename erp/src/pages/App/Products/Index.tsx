import React, { useRef, useCallback } from 'react';
import Product from '../../types/product.type';
import ProductList from './ProductList';
import { useAuth } from '@/context/AuthContext';
import { canPerform } from '@/pages/utils/permissionService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { useProductsPageState } from './hooks/useProductsPageState';
import { useProductsModals } from './hooks/useProductsModals';
import ProductsTopToolbar from './components/ProductsTopToolbar';
import ProductSummarySidebar from './components/ProductSummarySidebar';
import ProductMobileFilterDrawer from './components/ProductMobileFilterDrawer';
import ProductsModalsContainer from './modals/ProductsModalsContainer';

const categoryTree = undefined;

export interface ProductsProps {
  mode?: 'standard' | 'composition';
}

const Products: React.FC<ProductsProps> = ({ mode = 'standard' }) => {
  const { profile, isAdministrator } = useAuth();
  const roles = profile ? getProfileRoles(profile) : [];
  const canManageProducts = canPerform('productConfig', roles);
  const readOnly = !canManageProducts;

  const productListRef = useRef<{ refresh: () => void }>(null);

  const {
    filters,
    setFilters,
    currentFilters,
    currentTitle,
    handleCloseSpecialView,
    searchInput,
    handleSearchChange,
    handleSearchKeyDown,
    clearSearchInput,
    showTestProducts,
    setShowTestProducts,
    showMergedProducts,
    setShowMergedProducts,
    hasTestProducts,
    setHasTestProducts,
    visibilitySettings,
    toggleVisibility,
    isSidebarOpen,
    setIsSidebarOpen,
    isActionsMenuOpen,
    setIsActionsMenuOpen,
    menuRef,
    handleToggleActiveOnly,
    accordionOpen,
    toggleAccordion,
    catalogStats,
    summaryChannel,
    setSummaryChannel,
    fetchStats,
    handleFilterTotal,
    handleFilterActive,
    handleFilterDisabled,
    handleFilterDrafts,
  } = useProductsPageState({ mode, isAdministrator });

  const {
    isFormModalOpen,
    editingProduct,
    viewingProduct,
    initialFormData,
    isVariationModalOpen,
    editingVariation,
    variationParentProduct,
    isHistoryModalOpen,
    historyProduct,
    isStockModalOpen,
    stockLaunchTarget,
    openNewProduct,
    openEditProduct,
    openShowHistory,
    openLaunchStock,
    closeFormModal,
    closeVariationModal,
    closeHistoryModal,
    closeStockModal,
    closeViewingProduct,
  } = useProductsModals();

  const handleRefresh = useCallback(() => {
    productListRef.current?.refresh();
    fetchStats();
  }, [fetchStats]);

  const handleVariationModalClose = useCallback(() => {
    closeVariationModal();
    handleRefresh();
  }, [closeVariationModal, handleRefresh]);

  const handleSort = (_field: string, _direction: 'asc' | 'desc') => {
    // Ordenação gerenciada internamente pela ProductList
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative pb-16">
      <div className="flex-1 flex flex-col min-w-0 px-0.5 sm:px-2 lg:px-6 xl:px-8 pt-2 sm:pt-3 pb-6 xl:pb-8">
        <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-h-0">
          {/* Header Actions Container */}
          <ProductsTopToolbar
            mode={mode}
            searchInput={searchInput}
            onSearchChange={handleSearchChange}
            onSearchKeyDown={handleSearchKeyDown}
            onClearSearch={clearSearchInput}
            isAdministrator={isAdministrator}
            hasTestProducts={hasTestProducts}
            showTestProducts={showTestProducts}
            onShowTestProductsChange={setShowTestProducts}
            showMergedProducts={showMergedProducts}
            onShowMergedProductsChange={setShowMergedProducts}
            canManageProducts={canManageProducts}
            isActionsMenuOpen={isActionsMenuOpen}
            setIsActionsMenuOpen={setIsActionsMenuOpen}
            menuRef={menuRef}
            onNewProduct={() => openNewProduct(mode)}
            onOpenFilters={() => setIsSidebarOpen(true)}
            onToggleActiveOnly={handleToggleActiveOnly}
            activeOnly={filters.activeOnly}
          />

          {/* Section: Product Table (Left) + Sidebar (Right) */}
          <div className="flex gap-6 flex-1 items-start">
            {/* Conteúdo Principal: Tabela de Produtos */}
            <div className="flex-1 min-w-0">
              <ProductList
                mode={mode}
                readOnly={readOnly}
                filters={currentFilters}
                title={currentTitle}
                onCloseTrash={handleCloseSpecialView}
                visibilitySettings={
                  readOnly ? { ...visibilitySettings, actions: true } : visibilitySettings
                }
                onEdit={(p: Product) => openEditProduct(p, readOnly)}
                onShowHistory={canManageProducts ? openShowHistory : undefined}
                onLaunchStock={canManageProducts ? openLaunchStock : undefined}
                onToggleColumn={toggleVisibility}
                onSort={handleSort}
                categoryTree={categoryTree}
                ref={productListRef}
                onRefresh={handleRefresh}
                onTestDataAvailabilityChange={setHasTestProducts}
              />
            </div>

            {/* Sidebar Direita: Estatísticas e Filtros */}
            {canManageProducts && (
              <ProductSummarySidebar
                mode={mode}
                accordionOpen={accordionOpen}
                toggleAccordion={toggleAccordion}
                summaryChannel={summaryChannel}
                setSummaryChannel={setSummaryChannel}
                catalogStats={catalogStats}
                filters={filters}
                setFilters={setFilters}
                clearSearchInput={clearSearchInput}
                onFilterTotal={handleFilterTotal}
                onFilterActive={handleFilterActive}
                onFilterDisabled={handleFilterDisabled}
                onFilterDrafts={handleFilterDrafts}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal de Filtros para Mobile (< lg) */}
      {canManageProducts && (
        <ProductMobileFilterDrawer
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          filters={filters}
          setFilters={setFilters}
          clearSearchInput={clearSearchInput}
        />
      )}

      {/* Modals Container */}
      <ProductsModalsContainer
        canManageProducts={canManageProducts}
        isFormModalOpen={isFormModalOpen}
        editingProduct={editingProduct}
        initialFormData={initialFormData}
        onCloseFormModal={closeFormModal}
        onFormSuccess={handleRefresh}
        isHistoryModalOpen={isHistoryModalOpen}
        historyProduct={historyProduct}
        onCloseHistoryModal={closeHistoryModal}
        isVariationModalOpen={isVariationModalOpen}
        editingVariation={editingVariation}
        variationParentProduct={variationParentProduct}
        onCloseVariationModal={handleVariationModalClose}
        isStockModalOpen={isStockModalOpen}
        stockLaunchTarget={stockLaunchTarget}
        onCloseStockModal={closeStockModal}
        viewingProduct={viewingProduct}
        onCloseViewingProduct={closeViewingProduct}
      />
    </div>
  );
};

export default Products;
