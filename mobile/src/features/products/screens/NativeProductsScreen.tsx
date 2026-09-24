import React, { useRef, useState, useEffect } from 'react';
import { Alert, Share } from 'react-native';
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
import { useMobileProducts } from '../hooks/useMobileProducts';
import { duplicateMobileProduct } from '../services/mobileProductMutationService';
import { fetchMobileCategories } from '../services/mobileCategoryService';
import { NativeCategoriesScreen } from '../categories';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
  mode?: 'standard' | 'composition' | 'categories';
  onLaunchStock?: (product: any) => void;
}

export const NativeProductsScreen: React.FC<Props> = ({ isDarkMode, mode = 'standard', onLaunchStock }) => {
  const [screenMode, setScreenMode] = useState<'standard' | 'composition' | 'categories'>(mode);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const productsHook = useMobileProducts(screenMode === 'composition' ? 'composition' : 'standard');

  const [categories, setCategories] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newProductInitialData, setNewProductInitialData] = useState<Record<string, any> | undefined>(undefined);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<any | null>(null);
  const [ordersProduct, setOrdersProduct] = useState<any | null>(null);

  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 8;

  const loadCategories = async () => {
    const cats = await fetchMobileCategories();
    setCategories(cats);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handlePageChange = (page: number) => {
    productsHook.setCurrentPage(page);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleOpenNew = () => {
    setEditingProduct(null);
    setNewProductInitialData(undefined);
    setShowFormModal(true);
  };

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod);
    setShowFormModal(true);
  };

  const handleDuplicate = async (prod: any) => {
    try { await duplicateMobileProduct(prod); await productsHook.refresh(); Alert.alert('Produto duplicado', 'A cópia foi criada como rascunho.'); }
    catch (error: any) { Alert.alert('Não foi possível duplicar', error?.message || 'Tente novamente.'); }
  };

  const handleShare = async (prod: any) => {
    const price = Number(prod.promoPrice || prod.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    await Share.share({ message: `${prod.name || 'Produto'}\nCódigo: ${prod.code || prod.sku || 'sem código'}\nPreço: ${price}` });
  };

  return (
    <View style={[styles.container, isDarkMode && styles.dark, { paddingTop: topInset }]}>
      {screenMode === 'categories' ? (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <ProductsHeader
            mode={screenMode}
            onModeChange={setScreenMode}
            dark={isDarkMode}
            search=""
            totalCount={0}
            onSearch={() => {}}
            onNewProduct={handleOpenNew}
            onOpenConfigs={() => setShowConfigModal(true)}
            categories={categories}
            statusFilter="all"
            categoryFilter="all"
            catalogStatusFilter="all"
            onStatusFilterChange={() => {}}
            onCategoryFilterChange={() => {}}
            onCatalogStatusFilterChange={() => {}}
            showDeactivated={false}
            showMerged={false}
            onToggleDeactivated={() => {}}
            onToggleMerged={() => {}}
          />
          <NativeCategoriesScreen dark={isDarkMode} onCategoriesUpdated={loadCategories} />
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
            mode={screenMode}
            onModeChange={setScreenMode}
            dark={isDarkMode}
            search={productsHook.searchTerm}
            totalCount={productsHook.totalItems}
            onSearch={productsHook.setSearchTerm}
            onNewProduct={handleOpenNew}
            onNewComposition={() => {
              setEditingProduct({ itemType: 'composition' });
              setNewProductInitialData(undefined);
              setShowFormModal(true);
            }}
            onOpenConfigs={() => setShowConfigModal(true)}
            categories={categories}
            statusFilter={productsHook.statusFilter}
            categoryFilter={productsHook.categoryFilter}
            catalogStatusFilter={productsHook.catalogStatusFilter}
            onStatusFilterChange={productsHook.setStatusFilter}
            onCategoryFilterChange={productsHook.setCategoryFilter}
            onCatalogStatusFilterChange={productsHook.setCatalogStatusFilter}
            showDeactivated={productsHook.showDeactivated}
            showMerged={productsHook.showMerged}
            onToggleDeactivated={() => productsHook.setShowDeactivated(value => !value)}
            onToggleMerged={() => productsHook.setShowMerged(value => !value)}
          />

          {productsHook.loadError ? (
            <View style={styles.empty}>
              <Package size={40} color="#dc2626" />
              <Text style={styles.emptyText}>{productsHook.loadError}</Text>
              <TouchableOpacity onPress={() => productsHook.refresh()} style={styles.retryButton} accessibilityRole="button">
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : productsHook.products.length === 0 ? (
            <View style={styles.empty}>
              <Package size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>{screenMode === 'composition' ? 'Nenhuma composição encontrada' : 'Nenhum produto encontrado'}</Text>
            </View>
          ) : (
            productsHook.products.map(product => (
              <MobileProductCard
                key={product.id}
                product={product}
                dark={isDarkMode}
                onEdit={handleOpenEdit}
                onToggleCatalog={productsHook.handleToggleCatalog}
                onToggleActive={productsHook.handleToggleActive}
                onDelete={productsHook.handleDelete}
                onDuplicate={handleDuplicate}
                onShare={handleShare}
                onLaunchStock={onLaunchStock}
                onShowHistory={setHistoryProduct}
                onShowOrders={setOrdersProduct}
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
        visible={showFormModal}
        product={editingProduct}
        initialData={newProductInitialData}
        dark={isDarkMode}
        onClose={() => { setShowFormModal(false); setNewProductInitialData(undefined); }}
        onSave={productsHook.handleSave}
      />

      {/* Modal de Configurações (Categorias, Atributos e Variações) */}
      <ProductConfigModal
        visible={showConfigModal}
        dark={isDarkMode}
        onClose={() => setShowConfigModal(false)}
        onCategoriesUpdated={loadCategories}
        onNavigateToCategories={() => {
          setShowConfigModal(false);
          setScreenMode('categories');
        }}
      />
      <ProductPriceHistoryModal visible={Boolean(historyProduct)} dark={isDarkMode} product={historyProduct} onClose={() => setHistoryProduct(null)} />
      <ProductLinkedOrdersModal visible={Boolean(ordersProduct)} dark={isDarkMode} product={ordersProduct} onClose={() => setOrdersProduct(null)} />
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
  retryButton: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#2563eb' },
  retryButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
