import { Package } from 'lucide-react-native';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  isProductIdentificationLabelOnlyProfile,
  isStockistOnlyProductProfile,
  shouldHideProductCatalogPublicationStatus,
} from '../../../../../shared-utils/productPermissions';
import { useAuth } from '../../../contexts/AuthContext';
import { WEB_URL } from '../../../services/supabaseClient';
import { NativeCategoriesScreen } from '../categories';
import { MobileProductCard } from '../components/MobileProductCard';
import { MobileProductPagination } from '../components/MobileProductPagination';
import { ProductsHeader } from '../components/ProductsHeader';
import type { ProductListMode } from '../components/header/ProductsHeaderModeSelector';
import { useMobileProducts } from '../hooks/useMobileProducts';
import { MobileProductMetadataProvider } from '../hooks/useMobileProductMetadata';
import {
  getMobileCompositionEmptyHint,
  shouldShowMobileProductPagination,
} from '../domain/mobileProductListPresentation';
import { NativeMetaCatalogScreen } from './NativeMetaCatalogScreen';
import { ProductModulesMenu } from './ProductModulesMenu';
import { ProductScreenOverlays } from './ProductScreenOverlays';
import { copyMobileProductImages } from '../services/mobileProductPhotoService';
import {
  canShowMobileLinkedProductOrders,
  canShowMobileProductDeletionActions,
  runMobileProductDeleteAction,
  runMobileProductRestoreAction,
} from '../domain/mobileProductCardRules';
import { buildMobileProductDuplicationDraft } from '../domain/mobileProductDuplication';
import { getNextSequentialProductCode } from '../services/mobileProductCodeService';
import { loadFullProductForForm } from './loadFullProductForForm';
import { styles } from './nativeProductsScreen.styles';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
  mode?: ProductListMode;
}

export const NativeProductsScreen: React.FC<Props> = ({
  isDarkMode,
  mode,
}) => {
  const [screenMode, setScreenMode] = useState<ProductListMode>(mode ?? 'standard');
  const [selectedMode, setSelectedMode] = useState<ProductListMode | null>(mode ?? null);
  const [showMetaCatalog, setShowMetaCatalog] = useState(false);
  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const { canUseProductPermission, canUsePermission, isAdmin, userProfile, loadingProfile } = useAuth();
  const isStockistOnly = isStockistOnlyProductProfile(userProfile);
  const canViewCatalog = canUseProductPermission('viewProducts');
  const canEditProducts = canUseProductPermission('productConfig');
  const canDeleteProducts = canUseProductPermission('deleteProducts');
  const canDeleteProductsFromCardActions = canShowMobileProductDeletionActions({
    canEditProducts,
    canDeleteProducts,
  });
  const canViewCompositions = !isStockistOnly && canUseProductPermission('viewProductCompositions');
  const canCreateComposition = canEditProducts && !isStockistOnly;
  const canViewCategories = !isStockistOnly && canUseProductPermission('viewProductCategories');
  const canViewCharacteristics = canUseProductPermission('viewProductCharacteristics');
  const canViewMetaCatalog = canUsePermission('viewMetaCatalog', ['manager']);
  const canViewWhatsAppMarketplace = canUsePermission('viewWhatsAppMarketplace', ['manager']);
  const canPrintLabels = canUseProductPermission('printProductIdentificationLabels');
  const userRoles = Array.isArray(userProfile?.roles) ? userProfile.roles : [userProfile?.role];
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(userRoles);
  const hideCatalogPublicationStatus = shouldHideProductCatalogPublicationStatus(userProfile);
  const canViewDetails =
    !canEditProducts && !isLabelOnlyProfile && (canViewCatalog || canViewCompositions);
  const availableModes = useMemo(() => {
    const modes: ProductListMode[] = [];
    if (canViewCatalog) modes.push('standard');
    else if (canViewCompositions) modes.push('composition');
    if (canViewCategories) modes.push('categories');
    return modes;
  }, [canViewCatalog, canViewCategories, canViewCompositions]);
  const hasProductModules =
    availableModes.length > 0 || canViewCharacteristics || canViewMetaCatalog;
  const activeMode = availableModes.includes(screenMode)
    ? screenMode
    : (availableModes[0] ?? screenMode);
  const selectMode = (nextMode: ProductListMode) => {
    setScreenMode(nextMode);
    setSelectedMode(nextMode);
  };
  const returnToMenu = () => setSelectedMode(null);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const isProductListEnabled =
    selectedMode !== null && activeMode !== 'categories' && availableModes.includes(activeMode);
  const productsHook = useMobileProducts(
    activeMode === 'composition' ? 'composition' : 'standard',
    isProductListEnabled,
    canViewCompositions,
    isAdmin,
    !loadingProfile,
  );
  const canViewLinkedProductOrders = canShowMobileLinkedProductOrders({
    canEditProducts,
    isLabelOnlyProfile,
    showTrash: productsHook.showTrash,
  });
  const handleRestoreProductFromTrash = useCallback(
    (productId: string) => {
      runMobileProductRestoreAction({
        canDeleteProducts,
        productId,
        onRestore: productsHook.handleRestoreFromTrash,
        onPermissionDenied: () =>
          Alert.alert('Permissão insuficiente', 'Seu perfil não permite reativar produtos.'),
      });
    },
    [canDeleteProducts, productsHook.handleRestoreFromTrash]
  );
  const handleDeleteProduct = useCallback(
    (productId: string, isDraft = false) =>
      runMobileProductDeleteAction({
        canDeleteProducts:
          canDeleteProductsFromCardActions && !productsHook.showTrash && !isLabelOnlyProfile,
        productId,
        isDraft,
        onDelete: productsHook.handleDelete,
        onPermissionDenied: () =>
          Alert.alert(
            'Permissão insuficiente',
            isDraft
              ? 'Seu perfil não permite descartar rascunhos.'
              : 'Seu perfil não permite excluir ou desativar produtos.'
          ),
      }),
    [
      canDeleteProductsFromCardActions,
      isLabelOnlyProfile,
      productsHook.handleDelete,
      productsHook.showTrash,
    ]
  );
  const handleMoveProductToTrash = useCallback(
    (productId: string) =>
      runMobileProductDeleteAction({
        canDeleteProducts:
          canDeleteProductsFromCardActions && !productsHook.showTrash && !isLabelOnlyProfile,
        productId,
        isDraft: false,
        onDelete: productsHook.handleMoveToTrash,
        onPermissionDenied: () =>
          Alert.alert(
            'Permissão insuficiente',
            'Seu perfil não permite mover produtos para a lixeira.'
          ),
      }),
    [
      canDeleteProductsFromCardActions,
      isLabelOnlyProfile,
      productsHook.handleMoveToTrash,
      productsHook.showTrash,
    ]
  );
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newProductInitialData, setNewProductInitialData] = useState<
    Record<string, any> | undefined
  >(undefined);
  const [showFormModal, setShowFormModal] = useState(false);
  const [ordersProduct, setOrdersProduct] = useState<any | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<any | null>(null);
  const [loadingProductForEdit, setLoadingProductForEdit] = useState(false);
  const [variationToMove, setVariationToMove] = useState<{
    variation: any;
    parentProduct: any;
  } | null>(null);
  const [variationToMerge, setVariationToMerge] = useState<{
    variation: any;
    parentProduct: any;
  } | null>(null);
  const autoSavedProductFormRef = useRef(false);

  const handleProductFormSave = useCallback(
    (productData: any) => {
      autoSavedProductFormRef.current = false;
      return productsHook.handleSave(productData);
    },
    [productsHook.handleSave]
  );

  const handleProductFormAutoSave = useCallback(
    (productData: any) => {
      autoSavedProductFormRef.current = true;
      return productsHook.handleAutoSave(productData);
    },
    [productsHook.handleAutoSave]
  );

  const handleProductFormClose = useCallback(() => {
    if (autoSavedProductFormRef.current) {
      autoSavedProductFormRef.current = false;
      void productsHook.refresh();
    }
    setShowFormModal(false);
    setEditingProduct(null);
    setNewProductInitialData(undefined);
  }, [productsHook.refresh]);

  const topInset =
    Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0) + 8;

  useEffect(() => {
    if (activeMode !== screenMode) setScreenMode(activeMode);
  }, [activeMode, screenMode]);

  useEffect(() => {
    if (selectedMode !== null && !availableModes.includes(selectedMode)) {
      setSelectedMode(null);
    }
  }, [availableModes, selectedMode]);

  useEffect(() => {
    if (!canDeleteProducts && productsHook.showTrash) productsHook.setShowTrash(false);
  }, [canDeleteProducts, productsHook.showTrash, productsHook.setShowTrash]);

  const handlePageChange = (page: number) => {
    productsHook.setCurrentPage(page);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleOpenNew = () => {
    if (!canEditProducts) return;
    autoSavedProductFormRef.current = false;
    setEditingProduct(null);
    setNewProductInitialData(undefined);
    setShowFormModal(true);
  };

  const handleOpenEdit = async (prod: any) => {
    if (!canEditProducts) return;
    autoSavedProductFormRef.current = false;
    setLoadingProductForEdit(true);
    try {
      const fullProduct = await loadFullProductForForm(
        String(prod.id),
        productsHook.showTestProducts,
        'edicao'
      );
      const requestedVariationId = String(prod.selectedVariationId || '');
      const selectedVariationExists = Boolean(
        requestedVariationId &&
          fullProduct.allVariations?.some(
            (variation: any) => String(variation.id) === requestedVariationId
          )
      );
      setEditingProduct(
        selectedVariationExists
          ? { ...fullProduct, selectedVariationId: requestedVariationId }
          : fullProduct
      );
      setNewProductInitialData(undefined);
      setShowFormModal(true);
    } catch (error: any) {
      Alert.alert(
        'Não foi possível abrir o produto',
        error?.message || 'Atualize a lista e tente novamente.'
      );
    } finally {
      setLoadingProductForEdit(false);
    }
  };

  const handleDuplicate = async (prod: any) => {
    if (!canEditProducts) return;
    setLoadingProductForEdit(true);
    try {
      const source = await loadFullProductForForm(
        String(prod.id),
        productsHook.showTestProducts,
        'duplicacao'
      );

      const code = await getNextSequentialProductCode();
      const sourceImages = Array.isArray(source.images) ? source.images : [];
      let images = sourceImages;
      if (sourceImages.length > 0) {
        try {
          images = await copyMobileProductImages(sourceImages);
        } catch (error) {
          console.warn('[NativeProductsScreen] Não foi possível criar cópias independentes das fotos:', error);
          Alert.alert('Fotos mantidas', 'Não foi possível copiar as fotos; as originais foram mantidas.');
        }
      }
      setEditingProduct(buildMobileProductDuplicationDraft(source, code, images));
      setNewProductInitialData(undefined);
      setShowFormModal(true);
    } catch (error: any) {
      Alert.alert('Não foi possível duplicar', error?.message || 'Tente novamente.');
    } finally {
      setLoadingProductForEdit(false);
    }
  };

  const handleOpenMetaCatalog = () => {
    if (!canViewMetaCatalog) return;
    setShowMetaCatalog(true);
  };

  const handleOpenMetaCatalogInErp = () => {
    Linking.openURL(`${WEB_URL}/products/meta-catalog`).catch(() => {
      Alert.alert('Não foi possível abrir o Catálogo Meta', 'Tente novamente mais tarde.');
    });
  };

  const handleOpenWhatsAppMarketplace = () => {
    Linking.openURL(`${WEB_URL}/registrations/whatsapp-marketplace`).catch(() => {
      Alert.alert('Não foi possível abrir o Marketplace WhatsApp', 'Tente novamente mais tarde.');
    });
  };

  return (
    <View style={[styles.container, isDarkMode && styles.dark, { paddingTop: topInset }]}>
      {showMetaCatalog && canViewMetaCatalog ? (
        <NativeMetaCatalogScreen
          dark={isDarkMode}
          isAdmin={isAdmin}
          onBack={() => setShowMetaCatalog(false)}
          onOpenErpPanel={handleOpenMetaCatalogInErp}
        />
      ) : !hasProductModules ? (
        <View style={styles.empty}>
          <Package size={40} color="#2563eb" />
          <Text style={[styles.emptyText, isDarkMode && styles.loading]}>
            Recursos de produtos disponíveis para este perfil
          </Text>
          {canViewWhatsAppMarketplace && (
            <TouchableOpacity
              onPress={handleOpenWhatsAppMarketplace}
              style={styles.retryButton}
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Abrir Marketplace WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : selectedMode === null ? (
        <ProductModulesMenu
          availableModes={availableModes}
          isDarkMode={isDarkMode}
          selectMode={selectMode}
          canViewCharacteristics={canViewCharacteristics}
          canViewMetaCatalog={canViewMetaCatalog}
          onOpenCharacteristics={() => setShowAttributesModal(true)}
          onOpenMetaCatalog={handleOpenMetaCatalog}
        />
      ) : activeMode === 'categories' ? (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <ProductsHeader
            mode={activeMode}
            onBack={returnToMenu}
            dark={isDarkMode}
            search=""
            totalCount={0}
            onSearch={() => {}}
            onNewProduct={handleOpenNew}
            canCreateProduct={canEditProducts}
            canCreateComposition={canCreateComposition}
            canViewWhatsAppMarketplace={canViewWhatsAppMarketplace}
            onOpenWhatsAppMarketplace={handleOpenWhatsAppMarketplace}
            statusFilter="all"
            showDeactivated={false}
            onToggleDeactivated={() => {}}
          />
          <NativeCategoriesScreen dark={isDarkMode} />
        </View>
      ) : (
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
            onBack={returnToMenu}
            dark={isDarkMode}
            search={productsHook.searchTerm}
            totalCount={productsHook.totalItems}
            showCount={productsHook.products.length > 0}
            onSearch={productsHook.setSearchTerm}
            onSubmitSearch={productsHook.submitSearchTerm}
            onNewProduct={handleOpenNew}
            canCreateProduct={canEditProducts}
            onNewComposition={() => {
              if (!canCreateComposition) return;
              setEditingProduct(null);
              setNewProductInitialData({ itemType: 'composition' });
              setShowFormModal(true);
            }}
            canCreateComposition={canCreateComposition}
            canViewWhatsAppMarketplace={canViewWhatsAppMarketplace}
            onOpenWhatsAppMarketplace={handleOpenWhatsAppMarketplace}
            statusFilter={productsHook.statusFilter}
            showMergedProducts={productsHook.showMergedProducts}
            onToggleMergedProducts={productsHook.onToggleMergedProducts}
            showDeactivated={productsHook.showDeactivated}
            onToggleDeactivated={() => productsHook.setShowDeactivated((value) => !value)}
            showTrash={productsHook.showTrash}
            canViewTrash={canDeleteProducts}
            onToggleTrash={() => productsHook.setShowTrash((value) => !value)}
          />

          {productsHook.loading && !productsHook.refreshing ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loading}>Sincronizando catálogo...</Text>
            </View>
          ) : productsHook.loadError && productsHook.products.length === 0 ? (
            <View style={styles.empty}>
              <Package size={40} color="#dc2626" />
              <Text
                style={styles.emptyText}
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                {productsHook.loadError}
              </Text>
              <TouchableOpacity
                onPress={() => productsHook.retry()}
                style={styles.retryButton}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : productsHook.products.length === 0 ? (
            <View style={styles.empty}>
              <Package size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>
                {activeMode === 'composition'
                  ? 'Nenhum produto composto encontrado'
                  : productsHook.showTrash
                    ? 'A lixeira está vazia'
                    : 'Nenhum item encontrado'}
              </Text>
              {!productsHook.showTrash && (
                <Text style={[styles.emptyHint, isDarkMode && styles.emptyHintDark]}>
                  {activeMode === 'composition'
                    ? getMobileCompositionEmptyHint(canCreateComposition)
                    : 'Tente ajustar seus filtros ou adicione um novo produto ou serviço.'}
                </Text>
              )}
            </View>
          ) : (
            <MobileProductMetadataProvider products={productsHook.products}>
            {productsHook.products.map((product) => (
              <MobileProductCard
                key={product.id}
                product={product}
                dark={isDarkMode}
                showTrash={productsHook.showTrash}
                onRestore={productsHook.showTrash ? handleRestoreProductFromTrash : undefined}
                onMoveToTrash={handleMoveProductToTrash}
                onEdit={handleOpenEdit}
                onToggleCatalog={productsHook.handleToggleCatalog}
                onToggleActive={productsHook.handleToggleActive}
                onDelete={handleDeleteProduct}
                canEdit={canEditProducts && !productsHook.showTrash}
                canDelete={canDeleteProducts && !productsHook.showTrash}
                canDeleteFromMenu={canDeleteProductsFromCardActions && !productsHook.showTrash}
                canChangeCatalog={canEditProducts && !productsHook.showTrash && !hideCatalogPublicationStatus}
                showCatalogStatus={!hideCatalogPublicationStatus}
                canPrintLabels={canPrintLabels && !productsHook.showTrash}
                canViewDetails={canViewDetails && !productsHook.showTrash}
                isLabelOnlyProfile={isLabelOnlyProfile}
                onDuplicate={handleDuplicate}
                onViewDetails={setDetailsProduct}
                onShowOrders={canViewLinkedProductOrders ? setOrdersProduct : undefined}
                onMoveVariation={
                  canEditProducts && !productsHook.showTrash && !isLabelOnlyProfile
                    ? (variation, parentProduct) => setVariationToMove({ variation, parentProduct })
                    : undefined
                }
                onMergeVariation={
                  canEditProducts && !productsHook.showTrash && !isLabelOnlyProfile
                    ? (variation, parentProduct) =>
                        setVariationToMerge({ variation, parentProduct })
                    : undefined
                }
              />
            ))}
            </MobileProductMetadataProvider>
          )}

          {shouldShowMobileProductPagination(
            productsHook.products.length,
            productsHook.loading,
            productsHook.refreshing,
          ) && (
            <MobileProductPagination
              currentPage={productsHook.currentPage}
              totalPages={productsHook.totalPages}
              totalItems={productsHook.totalItems}
              itemsPerPage={productsHook.itemsPerPage}
              dark={isDarkMode}
              onPageChange={handlePageChange}
            />
          )}
        </ScrollView>
      )}

      <ProductScreenOverlays
        productForm={{
          visible: showFormModal && canEditProducts,
          product: editingProduct,
          initialData: newProductInitialData,
          dark: isDarkMode,
          onClose: handleProductFormClose,
          onSave: handleProductFormSave,
          onAutoSave: handleProductFormAutoSave,
        }}
        loadingProductForEdit={loadingProductForEdit}
        attributesManager={{
          visible: showAttributesModal && canViewCharacteristics,
          dark: isDarkMode,
          onClose: () => setShowAttributesModal(false),
        }}
        linkedOrders={{
          visible: Boolean(ordersProduct) && canViewLinkedProductOrders,
          dark: isDarkMode,
          product: ordersProduct,
          onClose: () => setOrdersProduct(null),
        }}
        productDetails={{
          visible: Boolean(detailsProduct) && canViewDetails,
          dark: isDarkMode,
          product: detailsProduct,
          onClose: () => setDetailsProduct(null),
        }}
        moveVariation={{
          visible: Boolean(variationToMove) && canEditProducts && !isLabelOnlyProfile,
          dark: isDarkMode,
          variation: variationToMove?.variation || null,
          parentProduct: variationToMove?.parentProduct || null,
          onClose: () => setVariationToMove(null),
          onMoved: productsHook.refresh,
        }}
        mergeVariation={{
          visible: Boolean(variationToMerge) && canEditProducts && !isLabelOnlyProfile,
          dark: isDarkMode,
          variation: variationToMerge?.variation || null,
          parentProduct: variationToMerge?.parentProduct || null,
          onClose: () => setVariationToMerge(null),
          onMerged: productsHook.refresh,
        }}
      />
    </View>
  );
};
