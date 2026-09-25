import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, StatusBar } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../../contexts/AuthContext';
import type { ScopeConfiguration, ScopeProduct, ScopeSupplier, InventoryScopeType } from '../hooks/useInventoryScopeBuilder';
import { fetchInventoryScopeProducts, fetchInventoryScopeSuppliers } from '../../../../services/stockService';
import { InventoryProductSearchModal, type SearchableProduct } from '../modals/InventoryProductSearchModal';
import { InventoryScopeTypeSelector } from '../components/InventoryScopeTypeSelector';

interface Props {
  isDarkMode: boolean;
  onCancel: () => void;
  onConfirm: (config: ScopeConfiguration) => void;
}

export const InventoryScopeScreen: React.FC<Props> = ({ isDarkMode, onCancel, onConfirm }) => {
  const { userProfile } = useAuth();
  const [suppliers, setSuppliers] = useState<ScopeSupplier[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [expandedType, setExpandedType] = useState<InventoryScopeType | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [customProducts, setCustomProducts] = useState<SearchableProduct[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  // Load Initial Data
  useEffect(() => {
    fetchInventoryScopeSuppliers()
      .then(supplierData => {
        setSuppliers(supplierData as ScopeSupplier[]);
        setLoadingData(false);
      })
      .catch(() => setLoadingData(false));
  }, []);

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  const confirmDirectly = async (type: InventoryScopeType, supplierId?: string) => {
    setLoadingData(true);
    try {
      let allProducts: ScopeProduct[];
      if (type === 'custom') {
        allProducts = customProducts as ScopeProduct[];
      } else {
        allProducts = (await fetchInventoryScopeProducts(type, supplierId)) as ScopeProduct[];
      }

      const dateStr = new Date().toLocaleDateString('pt-BR', { month: 'long' });
      let name = '';
      if (type === 'full') name = `Inventário Geral - ${dateStr}`;
      else if (type === 'supplier') {
        const supplierName = suppliers.find(s => s.id === supplierId)?.full_name;
        name = supplierName ? `Inventário ${supplierName}` : `Inventário por Fornecedor`;
      } else {
        name = `Inventário Personalizado`;
      }

      const items: ScopeConfiguration['itemsSnapshot'] = [];

      const getSupplierNames = (product: ScopeProduct) => {
        const ids = [...new Set([product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].filter(Boolean).map(String))];
        const names = ids.map(id => suppliers.find(s => String(s.id) === id)?.full_name).filter(Boolean);
        return names.join(' / ') || 'Fábrica não informada';
      };

      const getAssignedSupplier = (product: ScopeProduct) => {
        const id = [product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].find(Boolean);
        return (id && suppliers.find(s => String(s.id) === String(id))?.full_name) || 'Sem fornecedor';
      };

      const addProduct = (product: ScopeProduct) => {
        items.push({
          productId: String(product.id),
          variationId: product.variation_id ? String(product.variation_id) : undefined,
          name: product.name || product.description || 'Produto',
          supplierNames: getSupplierNames(product),
          assignedSupplier: getAssignedSupplier(product),
          systemStock: Number(product.stock ?? 0),
          unit: product.unit || 'UN',
          sku: product.sku || product.code || '',
          code: product.code || '',
          barcode: product.barcode || '',
        });
      };

      if (type === 'full' || type === 'custom') {
        for (const product of allProducts) addProduct(product);
      } else if (type === 'supplier' && supplierId) {
        const supplierProducts = allProducts.filter(p =>
          [p.main_supplier_id, p.supplier_id, ...(p.supplier_ids || [])].some(id => String(id) === String(supplierId))
        );
        for (const product of supplierProducts) addProduct(product);
      }

      onConfirm({
        type,
        name,
        hasStages: type === 'full',
        responsibleId: userProfile?.id || '',
        supplierId,
        itemsSnapshot: items,
      });
    } catch (error) {
      console.error('Não foi possível preparar o escopo do inventário:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos para este inventário. Tente novamente.');
    } finally {
      setLoadingData(false);
    }
  };

  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 16
  );

  if (loadingData) {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border, paddingTop: topInset + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Novo Inventário</Text>
          <Text style={[styles.headerSubtitle, { color: muted }]}>O que você deseja inventariar?</Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <X size={24} color={muted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <InventoryScopeTypeSelector
          isDarkMode={isDarkMode}
          suppliers={suppliers}
          expandedType={expandedType}
          onToggleExpand={type => setExpandedType(expandedType === type ? null : type)}
          selectedSupplierId={selectedSupplierId}
          onSelectSupplier={id => setSelectedSupplierId(id)}
          customProducts={customProducts}
          onOpenSearch={() => setSearchOpen(true)}
          onRemoveCustomProduct={prod =>
            setCustomProducts(current => current.filter(item => item.id !== prod.id || item.variation_id !== prod.variation_id))
          }
          onConfirmType={(type, supId) => void confirmDirectly(type, supId)}
        />
      </ScrollView>

      <InventoryProductSearchModal
        isDarkMode={isDarkMode}
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={product =>
          setCustomProducts(current =>
            current.some(item => item.id === product.id && item.variation_id === product.variation_id)
              ? current
              : [...current, product]
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 4 },
});
