import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Package } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductsHeader } from '../components/ProductsHeader';
import { MobileProductCard } from '../components/MobileProductCard';
import { MobileProductPagination } from '../components/MobileProductPagination';
import { ProductFormModal } from '../modals/ProductFormModal';
import { ProductConfigModal } from '../modals/ProductConfigModal';
import { useMobileProducts } from '../hooks/useMobileProducts';
import { fetchMobileCategories } from '../services/mobileCategoryService';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
}

export const NativeProductsScreen: React.FC<Props> = ({ isDarkMode }) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const productsHook = useMobileProducts();

  const [categories, setCategories] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

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
    setShowFormModal(true);
  };

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod);
    setShowFormModal(true);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.dark, { paddingTop: topInset }]}>
      {productsHook.loading && !productsHook.refreshing ? (
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
            dark={isDarkMode}
            search={productsHook.searchTerm}
            totalCount={productsHook.totalItems}
            onSearch={productsHook.setSearchTerm}
            onNewProduct={handleOpenNew}
            onOpenConfigs={() => setShowConfigModal(true)}
          />

          {productsHook.products.length === 0 ? (
            <View style={styles.empty}>
              <Package size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
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
        dark={isDarkMode}
        onClose={() => setShowFormModal(false)}
        onSave={productsHook.handleSave}
      />

      {/* Modal de Configurações (Categorias, Atributos e Variações) */}
      <ProductConfigModal
        visible={showConfigModal}
        dark={isDarkMode}
        onClose={() => setShowConfigModal(false)}
        onCategoriesUpdated={loadCategories}
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
});
