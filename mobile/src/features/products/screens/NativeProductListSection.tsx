import type React from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { MobileProductCard } from '../components/MobileProductCard';
import { MobileProductPagination } from '../components/MobileProductPagination';
import { ProductsHeader } from '../components/ProductsHeader';
import type { ProductListMode } from '../components/header/ProductsHeaderModeSelector';
import { shouldShowMobileProductPagination } from '../domain/mobileProductListPresentation';
import { MobileProductMetadataProvider } from '../hooks/useMobileProductMetadata';
import { NativeProductListStatus } from './NativeProductListStatus';
import { styles } from './nativeProductsScreen.styles';

interface NativeProductListSectionProps {
  scrollViewRef: React.RefObject<ScrollView | null>;
  activeMode: ProductListMode;
  isDarkMode: boolean;
  productsHook: any;
  canEditProducts: boolean;
  canCreateComposition: boolean;
  canViewWhatsAppMarketplace: boolean;
  canDeleteProducts: boolean;
  canDeleteProductsFromCardActions: boolean;
  hideCatalogPublicationStatus: boolean;
  canPrintLabels: boolean;
  canViewDetails: boolean;
  canViewLinkedProductOrders: boolean;
  isLabelOnlyProfile: boolean;
  onBack: () => void;
  onNewProduct: () => void;
  onNewComposition: () => void;
  onOpenWhatsAppMarketplace: () => void;
  onRestoreProductFromTrash: (productId: string) => void;
  onMoveProductToTrash: (productId: string) => void;
  onEditProduct: (product: any) => void;
  onDeleteProduct: (productId: string, isDraft?: boolean) => void;
  onDuplicateProduct: (product: any) => void;
  onViewDetails: (product: any) => void;
  onShowOrders: (product: any) => void;
  onMoveVariation: (variation: any, parentProduct: any) => void;
  onMergeVariation: (variation: any, parentProduct: any) => void;
  onPageChange: (page: number) => void;
}

/** Renderiza a listagem paginada de produtos ou composições no módulo nativo mobile. */
export const NativeProductListSection: React.FC<NativeProductListSectionProps> = ({
  scrollViewRef,
  activeMode,
  isDarkMode,
  productsHook,
  canEditProducts,
  canCreateComposition,
  canViewWhatsAppMarketplace,
  canDeleteProducts,
  canDeleteProductsFromCardActions,
  hideCatalogPublicationStatus,
  canPrintLabels,
  canViewDetails,
  canViewLinkedProductOrders,
  isLabelOnlyProfile,
  onBack,
  onNewProduct,
  onNewComposition,
  onOpenWhatsAppMarketplace,
  onRestoreProductFromTrash,
  onMoveProductToTrash,
  onEditProduct,
  onDeleteProduct,
  onDuplicateProduct,
  onViewDetails,
  onShowOrders,
  onMoveVariation,
  onMergeVariation,
  onPageChange,
}) => (
  <ScrollView
    ref={scrollViewRef}
    contentContainerStyle={styles.content}
    refreshControl={
      <RefreshControl
        refreshing={productsHook.refreshing}
        onRefresh={() => productsHook.refresh()}
      />
    }
  >
    <ProductsHeader
      mode={activeMode === 'composition' ? 'standard' : activeMode}
      onBack={onBack}
      dark={isDarkMode}
      search={productsHook.searchTerm}
      totalCount={productsHook.totalItems}
      showCount={productsHook.products.length > 0}
      onSearch={productsHook.setSearchTerm}
      onSubmitSearch={productsHook.submitSearchTerm}
      onNewProduct={onNewProduct}
      canCreateProduct={canEditProducts}
      onNewComposition={onNewComposition}
      canCreateComposition={canCreateComposition}
      canViewWhatsAppMarketplace={canViewWhatsAppMarketplace}
      onOpenWhatsAppMarketplace={onOpenWhatsAppMarketplace}
      statusFilter={productsHook.statusFilter}
      showMergedProducts={productsHook.showMergedProducts}
      onToggleMergedProducts={productsHook.onToggleMergedProducts}
      showDeactivated={productsHook.showDeactivated}
      onToggleDeactivated={() => productsHook.setShowDeactivated((value: boolean) => !value)}
      showTrash={productsHook.showTrash}
      canViewTrash={canDeleteProducts}
      onToggleTrash={() => productsHook.setShowTrash((value: boolean) => !value)}
    />

    {productsHook.loading && !productsHook.refreshing ? (
      <NativeProductListStatus state="loading" />
    ) : productsHook.loadError && productsHook.products.length === 0 ? (
      <NativeProductListStatus
        state="error"
        message={productsHook.loadError}
        onRetry={() => productsHook.retry()}
      />
    ) : productsHook.products.length === 0 ? (
      <NativeProductListStatus
        state="empty"
        isComposition={activeMode === 'composition'}
        showTrash={productsHook.showTrash}
        canCreateComposition={canCreateComposition}
        dark={isDarkMode}
      />
    ) : (
      <MobileProductMetadataProvider products={productsHook.products}>
        {productsHook.products.map((product: any) => (
          <MobileProductCard
            key={product.id}
            product={product}
            dark={isDarkMode}
            showTrash={productsHook.showTrash}
            onRestore={productsHook.showTrash ? onRestoreProductFromTrash : undefined}
            onMoveToTrash={onMoveProductToTrash}
            onEdit={onEditProduct}
            onToggleCatalog={productsHook.handleToggleCatalog}
            onToggleActive={productsHook.handleToggleActive}
            onDelete={onDeleteProduct}
            canEdit={canEditProducts && !productsHook.showTrash}
            canDelete={canDeleteProducts && !productsHook.showTrash}
            canDeleteFromMenu={canDeleteProductsFromCardActions && !productsHook.showTrash}
            canChangeCatalog={
              canEditProducts && !productsHook.showTrash && !hideCatalogPublicationStatus
            }
            showCatalogStatus={!hideCatalogPublicationStatus}
            canPrintLabels={canPrintLabels && !productsHook.showTrash}
            canViewDetails={canViewDetails && !productsHook.showTrash}
            isLabelOnlyProfile={isLabelOnlyProfile}
            onDuplicate={onDuplicateProduct}
            onViewDetails={onViewDetails}
            onShowOrders={canViewLinkedProductOrders ? onShowOrders : undefined}
            onMoveVariation={
              canEditProducts && !productsHook.showTrash && !isLabelOnlyProfile
                ? onMoveVariation
                : undefined
            }
            onMergeVariation={
              canEditProducts && !productsHook.showTrash && !isLabelOnlyProfile
                ? onMergeVariation
                : undefined
            }
          />
        ))}
      </MobileProductMetadataProvider>
    )}

    {shouldShowMobileProductPagination(
      productsHook.products.length,
      productsHook.loading,
      productsHook.refreshing
    ) && (
      <MobileProductPagination
        currentPage={productsHook.currentPage}
        totalPages={productsHook.totalPages}
        totalItems={productsHook.totalItems}
        itemsPerPage={productsHook.itemsPerPage}
        dark={isDarkMode}
        onPageChange={onPageChange}
      />
    )}
  </ScrollView>
);
