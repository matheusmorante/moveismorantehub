import type React from 'react';
import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Package } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductsHeader } from '../components/ProductsHeader';
import { MobileProductCard } from '../components/MobileProductCard';
import { MobileProductPagination } from '../components/MobileProductPagination';
import { ProductFormModal } from '../modals/ProductFormModal';
import { ProductConfigModal } from '../modals/ProductConfigModal';
import { ProductPriceHistoryModal } from '../modals/ProductPriceHistoryModal';
import { ProductLinkedOrdersModal } from '../modals/ProductLinkedOrdersModal';
import { MobileProductDetailsModal } from '../modals/MobileProductDetailsModal';
import { useMobileProducts } from '../hooks/useMobileProducts';
import { duplicateMobileProduct } from '../services/mobileProductMutationService';
import { fetchMobileCategories } from '../services/mobileCategoryService';
import { NativeCategoriesScreen } from '../categories';
import { useAuth } from '../../../contexts/AuthContext';
import { WEB_URL } from '../../../services/supabaseClient';
import {
  isProductIdentificationLabelOnlyProfile,
  shouldHideProductCatalogPublicationStatus,
} from '../../../../../shared-utils/productPermissions';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
  mode?: 'standard' | 'composition' | 'categories';
  onLaunchStock?: (product: any) => void;
}

export const NativeProductsScreen: React.FC<Props> = ({
  isDarkMode,
  mode = 'standard',
  onLaunchStock,
}) => {
  const [screenMode, setScreenMode] = useState<'standard' | 'composition' | 'categories'>(mode);
  const { canUseProductPermission, userProfile } = useAuth();
  const canViewCatalog = canUseProductPermission('viewProducts');
  const canEditProducts = canUseProductPermission('productConfig');
  const canDeleteProducts = canUseProductPermission('deleteProducts');
  const canViewCompositions = canUseProductPermission('viewProductCompositions');
  const canViewCategories = canUseProductPermission('viewProductCategories');
  const canViewCharacteristics = canUseProductPermission('viewProductCharacteristics');
  const canViewReconciliation = canUseProductPermission('viewProductReconciliation');
  const canPrintLabels = canUseProductPermission('printProductIdentificationLabels');
  const userRoles = Array.isArray(userProfile?.roles)
    ? userProfile.roles
    : [userProfile?.role];
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(userRoles);
  const hideCatalogPublicationStatus = shouldHideProductCatalogPublicationStatus(userProfile);
  const canViewDetails =
    !canEditProducts &&
    !isLabelOnlyProfile &&
    (canViewCatalog || canViewCompositions);
  const availableModes = useMemo(() => {
    const modes: Array<'standard' | 'composition' | 'categories'> = [];
    if (canViewCatalog) modes.push('standard');
    if (canViewCompositions) modes.push('composition');
    if (canViewCategories) modes.push('categories');
    return modes;
  }, [canViewCatalog, canViewCategories, canViewCompositions]);
  const activeMode = availableModes.includes(screenMode)
    ? screenMode
    : (availableModes[0] ?? screenMode);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const productsHook = useMobileProducts(
    activeMode === 'composition' ? 'composition' : 'standard',
    activeMode !== 'categories' && availableModes.includes(activeMode)
  );

  const [categories, setCategories] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newProductInitialData, setNewProductInitialData] = useState<
    Record<string, any> | undefined
  >(undefined);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<any | null>(null);
  const [ordersProduct, setOrdersProduct] = useState<any | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<any | null>(null);

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

  const handlePageChange = (page: number) => {
    productsHook.setCurrentPage(page);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleOpenNew = () => {
    if (!canEditProducts) return;
    setEditingProduct(null);
    setNewProductInitialData(undefined);
    setShowFormModal(true);
  };

  const handleOpenEdit = (prod: any) => {
    if (!canEditProducts) return;
    setEditingProduct(prod);
    setShowFormModal(true);
  };

  const handleDuplicate = async (prod: any) => {
    if (!canEditProducts) return;
    try {
      await duplicateMobileProduct(prod);
      await productsHook.refresh();
      Alert.alert('Produto duplicado', 'A cópia foi criada como rascunho.');
    } catch (error: any) {
      Alert.alert('Não foi possível duplicar', error?.message || 'Tente novamente.');
    }
  };

  const handleOpenReconciliation = () => {
    Linking.openURL(`${WEB_URL}/products/reconciliation/suppliers`).catch(() => {
      Alert.alert('Não foi possível abrir a conciliação', 'Tente novamente mais tarde.');
    });
  };

  return (
    <View style={[styles.container, isDarkMode && styles.dark, { paddingTop: topInset }]}>
      {activeMode === 'categories' ? (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <ProductsHeader
            mode={activeMode}
            availableModes={availableModes}
            onModeChange={setScreenMode}
            dark={isDarkMode}
            search=""
            totalCount={0}
            onSearch={() => {}}
            onNewProduct={handleOpenNew}
            canCreateProduct={canEditProducts}
            canCreateComposition={canEditProducts}
            onOpenConfigs={() => {
              if (canViewCategories || canViewCharacteristics) setShowConfigModal(true);
            }}
            canOpenConfigs={canViewCategories || canViewCharacteristics}
            onOpenReconciliation={handleOpenReconciliation}
            canViewReconciliation={canViewReconciliation}
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
              <Text style={styles.retryButtonText}>Abrir características e atributos</Text>
            </TouchableOpacity>
          )}
          {canViewReconciliation && (
            <TouchableOpacity
              onPress={handleOpenReconciliation}
              style={styles.retryButton}
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Abrir conciliação de fornecedores</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : productsHook.loading && !productsHook.refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loading}>Carregando produtos...</Text>
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
            onModeChange={setScreenMode}
            dark={isDarkMode}
            search={productsHook.searchTerm}
            totalCount={productsHook.totalItems}
            onSearch={productsHook.setSearchTerm}
            onNewProduct={handleOpenNew}
            canCreateProduct={canEditProducts}
            onNewComposition={() => {
              if (!canEditProducts) return;
              setEditingProduct({ itemType: 'composition' });
              setNewProductInitialData(undefined);
              setShowFormModal(true);
            }}
            canCreateComposition={canEditProducts}
            onOpenConfigs={() => {
              if (canViewCategories || canViewCharacteristics) setShowConfigModal(true);
            }}
            canOpenConfigs={canViewCategories || canViewCharacteristics}
            onOpenReconciliation={handleOpenReconciliation}
            canViewReconciliation={canViewReconciliation}
            categories={categories}
            statusFilter={productsHook.statusFilter}
            categoryFilter={productsHook.categoryFilter}
            catalogStatusFilter={productsHook.catalogStatusFilter}
            generalTypeFilter={productsHook.generalTypeFilter}
            showTestProducts={productsHook.showTestProducts}
            hasTestProducts={productsHook.hasTestProducts}
            canToggleTestProducts={canEditProducts}
            onStatusFilterChange={productsHook.setStatusFilter}
            onCategoryFilterChange={productsHook.setCategoryFilter}
            onCatalogStatusFilterChange={productsHook.setCatalogStatusFilter}
            onGeneralTypeFilterChange={productsHook.setGeneralTypeFilter}
            onToggleTestProducts={() =>
              productsHook.setShowTestProducts((value) => !value)
            }
            showDeactivated={productsHook.showDeactivated}
            onToggleDeactivated={() => productsHook.setShowDeactivated((value) => !value)}
          />

          {productsHook.loadError ? (
            <View style={styles.empty}>
              <Package size={40} color="#dc2626" />
              <Text style={styles.emptyText}>{productsHook.loadError}</Text>
              <TouchableOpacity
                onPress={() => productsHook.refresh()}
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
                  : 'Nenhum produto encontrado'}
              </Text>
            </View>
          ) : (
            productsHook.products.map((product) => (
              <MobileProductCard
                key={product.id}
                product={product}
                dark={isDarkMode}
                onEdit={handleOpenEdit}
                onToggleCatalog={productsHook.handleToggleCatalog}
                onToggleActive={productsHook.handleToggleActive}
                onDelete={productsHook.handleDelete}
                canEdit={canEditProducts}
                canDelete={canDeleteProducts}
                canChangeCatalog={canEditProducts && !hideCatalogPublicationStatus}
                showCatalogStatus={!hideCatalogPublicationStatus}
                canPrintLabels={canPrintLabels}
                canViewDetails={canViewDetails}
                isLabelOnlyProfile={isLabelOnlyProfile}
                onDuplicate={handleDuplicate}
                onViewDetails={setDetailsProduct}
                onLaunchStock={canEditProducts && !isLabelOnlyProfile ? onLaunchStock : undefined}
                onShowHistory={
                  canEditProducts && !isLabelOnlyProfile ? setHistoryProduct : undefined
                }
                onShowOrders={
                  canEditProducts && !isLabelOnlyProfile ? setOrdersProduct : undefined
                }
              />
            ))
          )}

          <MobileProductPagination
            currentPage={productsHook.currentPage}
            totalPages={productsHook.totalPages}
            totalItems={productsHook.totalItems}
            itemsPerPage={productsHook.itemsPerPage}
            dark={isDarkMode}
            onPageChange={handlePageChange}
          />
        </ScrollView>
      )}

      {/* Tela Fullscreen de Criação / Edição de Produto */}
      <ProductFormModal
        visible={showFormModal && canEditProducts}
        product={editingProduct}
        initialData={newProductInitialData}
        dark={isDarkMode}
        onClose={() => {
          setShowFormModal(false);
          setNewProductInitialData(undefined);
        }}
        onSave={productsHook.handleSave}
      />

      {/* Modal de Configurações (Categorias, Atributos e Variações) */}
      <ProductConfigModal
        visible={showConfigModal && (canViewCategories || canViewCharacteristics)}
        dark={isDarkMode}
        onClose={() => setShowConfigModal(false)}
        onCategoriesUpdated={loadCategories}
        onNavigateToCategories={() => {
          setShowConfigModal(false);
          setScreenMode('categories');
        }}
        canManageCategories={canViewCategories}
        canManageCharacteristics={canViewCharacteristics}
      />
      <ProductPriceHistoryModal
        visible={Boolean(historyProduct) && canEditProducts && !isLabelOnlyProfile}
        dark={isDarkMode}
        product={historyProduct}
        onClose={() => setHistoryProduct(null)}
      />
      <ProductLinkedOrdersModal
        visible={Boolean(ordersProduct) && canEditProducts && !isLabelOnlyProfile}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  dark: { backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 16, paddingBottom: 36, gap: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 10 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, fontWeight: '800', color: '#64748b', marginTop: 12 },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  retryButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
