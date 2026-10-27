import { Blocks, ChevronRight, FolderTree, Package } from 'lucide-react-native';
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
  StyleSheet,
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
import { MAX_VARIATION_IMAGES } from '../../../../../shared-utils/productImageLimits';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { useAuth } from '../../../contexts/AuthContext';
import { WEB_URL } from '../../../services/supabaseClient';
import { NativeCategoriesScreen } from '../categories';
import { MobileProductCard } from '../components/MobileProductCard';
import { MobileProductPagination } from '../components/MobileProductPagination';
import { ProductsHeader } from '../components/ProductsHeader';
import type { ProductListMode } from '../components/header/ProductsHeaderModeSelector';
import { useMobileProducts } from '../hooks/useMobileProducts';
import { canShowMobileProductCategoryFilter } from '../domain/mobileProductListFilters';
import {
  getMobileCompositionEmptyHint,
  shouldShowMobileProductPagination,
} from '../domain/mobileProductListPresentation';
import { MobileMergeVariationModal } from '../modals/MobileMergeVariationModal';
import { MobileMoveVariationModal } from '../modals/MobileMoveVariationModal';
import { MobileProductDetailsModal } from '../modals/MobileProductDetailsModal';
import { ProductConfigModal } from '../modals/ProductConfigModal';
import { ProductFormModal } from '../modals/ProductFormModal';
import { ProductLinkedOrdersModal } from '../modals/ProductLinkedOrdersModal';
import { NativeMetaCatalogScreen } from './NativeMetaCatalogScreen';
import { fetchMobileCategories } from '../services/mobileCategoryService';
import { fetchMobileProductsPage } from '../services/mobileProductFetchService';
import { copyMobileProductImages } from '../services/mobileProductPhotoService';
import {
  canShowMobileLinkedProductOrders,
  canShowMobileProductDeletionActions,
  runMobileProductDeleteAction,
  runMobileProductRestoreAction,
} from '../domain/mobileProductCardRules';
import { generateVariationSku } from '../domain/productSku';
import { getNextSequentialProductCode } from '../services/mobileProductCodeService';

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
    if (canViewCompositions) modes.push('composition');
    if (canViewCategories) modes.push('categories');
    return modes;
  }, [canViewCatalog, canViewCategories, canViewCompositions]);
  const activeMode = availableModes.includes(screenMode)
    ? screenMode
    : (availableModes[0] ?? screenMode);
  const productModules = [
    {
      key: 'standard' as const,
      title: 'Produtos',
      description: 'Consulte e gerencie os produtos do catálogo.',
      Icon: Package,
    },
    {
      key: 'composition' as const,
      title: 'Composições',
      description: 'Acesse as composições cadastradas.',
      Icon: Blocks,
    },
    {
      key: 'categories' as const,
      title: 'Ambientes e Categorias',
      description: 'Organize os ambientes e as categorias de produtos.',
      Icon: FolderTree,
    },
  ];
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
    userProfile?.id ?? null,
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
  const [categories, setCategories] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newProductInitialData, setNewProductInitialData] = useState<
    Record<string, any> | undefined
  >(undefined);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
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

  const loadCategories = useCallback(async () => {
    const cats = await fetchMobileCategories();
    setCategories(cats);
  }, []);

  useEffect(() => {
    if (canViewCategories || canEditProducts) {
      void loadCategories();
    } else {
      setCategories([]);
    }
  }, [canEditProducts, canViewCategories, loadCategories]);

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
      const result = await withTimeout(
        fetchMobileProductsPage(1, 1, {
          productId: String(prod.id),
          statusFilter: 'all',
          includeDeactivated: true,
          includeMerged: true,
          showTestProducts: productsHook.showTestProducts,
          throwOnError: true,
        }),
        10_000,
        null,
        'mobile:carregar-produto-completo-para-edicao'
      );
      const fullProduct = result?.data[0];
      if (!fullProduct) throw new Error('O cadastro completo do produto não foi encontrado.');
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
      const result = await withTimeout(
        fetchMobileProductsPage(1, 1, {
          productId: String(prod.id),
          statusFilter: 'all',
          includeDeactivated: true,
          includeMerged: true,
          showTestProducts: productsHook.showTestProducts,
          throwOnError: true,
        }),
        10_000,
        null,
        'mobile:carregar-produto-completo-para-duplicacao'
      );
      const source = result?.data[0];
      if (!source) throw new Error('O cadastro completo do produto não foi encontrado.');

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
      const sourceVariations = source.allVariations || source.variations || [];
      const variationImages =
        sourceVariations.length === 1 ? images : images.slice(0, MAX_VARIATION_IMAGES);
      const variations = sourceVariations.map((variation: any, index: number) => {
        const copy = {
          ...variation,
          id: crypto.randomUUID(),
          isVirtual: false,
          mergedToVariationId: undefined,
          sku: generateVariationSku(code, index),
          images: [...variationImages],
          status: 'draft',
          active: false,
        };
        delete (copy as any).image_url;
        delete (copy as any).imageUrl;
        return copy;
      });
      setEditingProduct({
        ...source,
        id: undefined,
        code,
        sku: code,
        createdAt: undefined,
        created_at: undefined,
        updatedAt: undefined,
        updated_at: undefined,
        parentId: undefined,
        selectedVariationId: undefined,
        isDraft: true,
        is_draft: true,
        active: false,
        status: 'draft',
        images,
        allVariations: variations,
        variations,
      });
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
      ) : availableModes.length === 0 ? (
        <View style={styles.empty}>
          <Package size={40} color="#2563eb" />
          <Text style={[styles.emptyText, isDarkMode && styles.loading]}>
            Recursos de produtos disponíveis para este perfil
          </Text>
          {canViewCharacteristics && (
            <TouchableOpacity
              onPress={() => setShowConfigModal(true)}
              style={styles.retryButton}
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Abrir características e configurações</Text>
            </TouchableOpacity>
          )}
          {canViewMetaCatalog && (
            <TouchableOpacity
              onPress={handleOpenMetaCatalog}
              style={styles.retryButton}
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Abrir Catálogo Meta</Text>
            </TouchableOpacity>
          )}
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
        <ScrollView contentContainerStyle={styles.moduleMenuContent}>
          <Text style={[styles.moduleMenuTitle, isDarkMode && styles.lightText]}>Produtos</Text>
          <Text style={[styles.moduleMenuSubtitle, isDarkMode && styles.mutedTextDark]}>
            Escolha a área que deseja consultar.
          </Text>
          {productModules
            .filter(({ key }) => availableModes.includes(key))
            .map(({ key, title, description, Icon }) => (
              <TouchableOpacity
                key={key}
                testID={`products-module-${key}`}
                onPress={() => selectMode(key)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${title}`}
                style={[styles.moduleMenuCard, isDarkMode && styles.moduleMenuCardDark]}
              >
                <View style={[styles.moduleIconBox, isDarkMode && styles.moduleIconBoxDark]}>
                  <Icon size={21} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
                </View>
                <View style={styles.moduleMenuCardText}>
                  <Text style={[styles.moduleMenuCardTitle, isDarkMode && styles.lightText]}>
                    {title}
                  </Text>
                  <Text
                    style={[styles.moduleMenuCardDescription, isDarkMode && styles.mutedTextDark]}
                  >
                    {description}
                  </Text>
                </View>
                <ChevronRight size={19} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            ))}
        </ScrollView>
      ) : activeMode === 'categories' ? (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <ProductsHeader
            mode={activeMode}
            availableModes={availableModes}
            onModeChange={selectMode}
            onBack={returnToMenu}
            dark={isDarkMode}
            search=""
            totalCount={0}
            onSearch={() => {}}
            onNewProduct={handleOpenNew}
            canCreateProduct={canEditProducts}
            canCreateComposition={canCreateComposition}
            onOpenConfigs={() => {
              if (canViewCategories || canViewCharacteristics) setShowConfigModal(true);
            }}
            canOpenConfigs={canViewCategories || canViewCharacteristics}
            canViewMetaCatalog={canViewMetaCatalog}
            canViewWhatsAppMarketplace={canViewWhatsAppMarketplace}
            canFilterByCategory={canShowMobileProductCategoryFilter(canViewCategories, canEditProducts)}
            onOpenMetaCatalog={handleOpenMetaCatalog}
            onOpenWhatsAppMarketplace={handleOpenWhatsAppMarketplace}
            categories={categories}
            statusFilter="all"
            categoryFilter="all"
            catalogStatusFilter="all"
            onStatusFilterChange={() => {}}
            onCategoryFilterChange={() => {}}
            onCatalogStatusFilterChange={() => {}}
            showDeactivated={false}
            onToggleDeactivated={() => {}}
          />
          <NativeCategoriesScreen dark={isDarkMode} onCategoriesUpdated={loadCategories} />
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
            mode={activeMode}
            availableModes={availableModes}
            onModeChange={selectMode}
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
            onOpenConfigs={() => {
              if (canViewCategories || canViewCharacteristics) setShowConfigModal(true);
            }}
            canOpenConfigs={canViewCategories || canViewCharacteristics}
            canViewMetaCatalog={canViewMetaCatalog}
            canViewWhatsAppMarketplace={canViewWhatsAppMarketplace}
            canFilterByCategory={canShowMobileProductCategoryFilter(canViewCategories, canEditProducts)}
            onOpenMetaCatalog={handleOpenMetaCatalog}
            onOpenWhatsAppMarketplace={handleOpenWhatsAppMarketplace}
            categories={categories}
            statusFilter={productsHook.statusFilter}
            categoryFilter={productsHook.categoryFilter}
            catalogStatusFilter={productsHook.catalogStatusFilter}
            generalTypeFilter={productsHook.generalTypeFilter}
            showMergedProducts={productsHook.showMergedProducts}
            onToggleMergedProducts={productsHook.onToggleMergedProducts}
            isAdministrator={isAdmin}
            showTestProducts={productsHook.showTestProducts}
            onToggleTestProducts={productsHook.onToggleTestProducts}
            onStatusFilterChange={productsHook.setStatusFilter}
            onCategoryFilterChange={productsHook.setCategoryFilter}
            onCatalogStatusFilterChange={productsHook.setCatalogStatusFilter}
            onGeneralTypeFilterChange={productsHook.setGeneralTypeFilter}
            onResetFilters={productsHook.resetFilters}
            showDeactivated={productsHook.showDeactivated}
            onToggleDeactivated={() => productsHook.setShowDeactivated((value) => !value)}
            showTrash={productsHook.showTrash}
            canViewTrash={canDeleteProducts}
            onToggleTrash={() => productsHook.setShowTrash((value) => !value)}
          />

          {productsHook.loading && !productsHook.refreshing ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loading}>Carregando produtos...</Text>
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
                  ? 'Nenhuma composição encontrada'
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
            productsHook.products.map((product) => (
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
            ))
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
              onItemsPerPageChange={productsHook.onItemsPerPageChange}
            />
          )}
        </ScrollView>
      )}

      {/* Tela Fullscreen de Criação / Edição de Produto */}
      <ProductFormModal
        visible={showFormModal && canEditProducts}
        product={editingProduct}
        initialData={newProductInitialData}
        dark={isDarkMode}
        onClose={handleProductFormClose}
        onSave={handleProductFormSave}
        onAutoSave={handleProductFormAutoSave}
      />
      {loadingProductForEdit && (
        <View style={[styles.editLoadingOverlay, isDarkMode && styles.dark]}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loading}>Carregando variações do produto…</Text>
        </View>
      )}

      {/* Modal de Configurações (Categorias, Características e Variações) */}
      <ProductConfigModal
        visible={showConfigModal && (canViewCategories || canViewCharacteristics)}
        dark={isDarkMode}
        onClose={() => setShowConfigModal(false)}
        onCategoriesUpdated={loadCategories}
        onNavigateToCategories={() => {
          setShowConfigModal(false);
          selectMode('categories');
        }}
        canManageCategories={canViewCategories}
        canManageCharacteristics={canViewCharacteristics}
      />
      <ProductLinkedOrdersModal
        visible={Boolean(ordersProduct) && canViewLinkedProductOrders}
        dark={isDarkMode}
        product={ordersProduct}
        onClose={() => setOrdersProduct(null)}
      />
      <MobileProductDetailsModal
        visible={Boolean(detailsProduct) && canViewDetails}
        dark={isDarkMode}
        product={detailsProduct}
        onClose={() => setDetailsProduct(null)}
      />
      <MobileMoveVariationModal
        visible={Boolean(variationToMove) && canEditProducts && !isLabelOnlyProfile}
        dark={isDarkMode}
        variation={variationToMove?.variation || null}
        parentProduct={variationToMove?.parentProduct || null}
        onClose={() => setVariationToMove(null)}
        onMoved={productsHook.refresh}
      />
      <MobileMergeVariationModal
        visible={Boolean(variationToMerge) && canEditProducts && !isLabelOnlyProfile}
        dark={isDarkMode}
        variation={variationToMerge?.variation || null}
        parentProduct={variationToMerge?.parentProduct || null}
        onClose={() => setVariationToMerge(null)}
        onMerged={productsHook.refresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  dark: { backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 16, paddingBottom: 36, gap: 10 },
  loadingContent: {
    minHeight: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleMenuContent: { padding: 16, paddingBottom: 32, gap: 12 },
  moduleMenuTitle: { fontSize: 21, fontWeight: '900', color: '#0f172a' },
  moduleMenuSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: -6,
    marginBottom: 4,
  },
  moduleMenuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  moduleMenuCardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  moduleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  moduleIconBoxDark: { backgroundColor: 'rgba(30, 58, 138, 0.35)' },
  moduleMenuCardText: { flex: 1, gap: 3 },
  moduleMenuCardTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  moduleMenuCardDescription: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  lightText: { color: '#f8fafc' },
  mutedTextDark: { color: '#94a3b8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 10 },
  editLoadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248,250,252,0.9)',
  },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, fontWeight: '800', color: '#64748b', marginTop: 12 },
  emptyHint: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6, paddingHorizontal: 24 },
  emptyHintDark: { color: '#94a3b8' },
  retryButton: {
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  retryButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
