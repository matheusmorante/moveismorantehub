import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, StatusBar } from 'react-native';
import { X, Package, Users, Filter } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../../contexts/AuthContext';
import type { ScopeConfiguration, ScopeProduct, ScopeSupplier, InventoryScopeType } from '../hooks/useInventoryScopeBuilder';
import { clearInventoryScopeCache, fetchInventoryScopeProducts, fetchInventoryScopeSuppliers } from '../../../../services/stockService';
import { InventoryProductSearchModal, type SearchableProduct } from '../components/InventoryProductSearchModal';

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
    fetchInventoryScopeSuppliers().then((supplierData) => {
      setSuppliers(supplierData as ScopeSupplier[]);
      setLoadingData(false);
    }).catch(() => setLoadingData(false));
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
      allProducts = await fetchInventoryScopeProducts(type, supplierId) as ScopeProduct[];
    }
    const dateStr = new Date().toLocaleDateString('pt-BR', { month: 'long' });
    let name = '';
    if (type === 'full') name = `Inventário Geral - ${dateStr}`;
    else if (type === 'supplier') {
      const supplierName = suppliers.find(s => s.id === supplierId)?.full_name;
      name = supplierName ? `Inventário ${supplierName}` : `Inventário por Fornecedor`;
    }
    else name = `Inventário Personalizado`;

    const items: ScopeConfiguration['itemsSnapshot'] = [];
    
    const getSupplierNames = (product: ScopeProduct) => {
        const ids = [...new Set([product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].filter(Boolean).map(String))];
        const names = ids.map(id => suppliers.find(s => String(s.id) === id)?.full_name).filter(Boolean);
        return names.join(' / ') || 'Fábrica não informada';
    };

    const addProduct = (product: ScopeProduct) => {
        const supplierName = getSupplierNames(product);
        items.push({
            productId: String(product.id),
            variationId: product.variation_id ? String(product.variation_id) : undefined,
            name: product.name || product.description || 'Produto',
            supplierNames: supplierName,
            assignedSupplier: getAssignedSupplier(product),
            systemStock: Number(product.stock ?? 0),
            unit: product.unit || 'UN',
        });
    };

    const getAssignedSupplier = (product: ScopeProduct) => {
        const id = [product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].find(Boolean);
        return (id && suppliers.find(s => String(s.id) === String(id))?.full_name) || 'Sem fornecedor';
    };

    if (type === 'full') {
        for (const product of allProducts) addProduct(product);
    } else if (type === 'supplier' && supplierId) {
        const supplierProducts = allProducts.filter(p =>
          [p.main_supplier_id, p.supplier_id, ...(p.supplier_ids || [])].some(id => String(id) === String(supplierId))
        );
        for (const product of supplierProducts) addProduct(product);
    } else if (type === 'custom') {
        for (const product of allProducts) addProduct(product);
    }

    onConfirm({
        type,
        name,
        hasStages: type === 'full',
        // A autoria do inventário no aplicativo sempre vem do usuário autenticado.
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
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16
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
          <Text style={[styles.headerSubtitle, { color: muted }]}>
            O que você deseja inventariar?
          </Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <X size={24} color={muted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[styles.typeOption, { backgroundColor: surface, borderColor: border }]} 
                    onPress={() => void confirmDirectly('full')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={[styles.typeIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)', marginBottom: 0 }]}>
                    <Package size={24} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                      <Text style={[styles.typeTitle, { color: textPrimary }]}>Estoque Completo</Text>
                      <Text style={[styles.typeDesc, { color: muted }]}>Todas as variações ativas cadastradas no sistema.</Text>
                  </View>
              </View>
            </TouchableOpacity>
            <View style={{ marginBottom: expandedType === 'supplier' ? 12 : 0 }}>
                <TouchableOpacity 
                  style={[
                      styles.typeOption, 
                      { backgroundColor: surface, borderColor: border },
                      expandedType === 'supplier' ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 } : {}
                  ]} 
                  onPress={() => setExpandedType(expandedType === 'supplier' ? null : 'supplier')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <View style={[styles.typeIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)', marginBottom: 0 }]}>
                        <Users size={24} color="#3b82f6" />
                      </View>
                      <View style={{ flex: 1 }}>
                          <Text style={[styles.typeTitle, { color: textPrimary }]}>Por Fornecedor</Text>
                          <Text style={[styles.typeDesc, { color: muted }]}>Selecione um fornecedor e conte as variações relacionadas.</Text>
                      </View>
                  </View>
                </TouchableOpacity>

                {expandedType === 'supplier' && (
                    <View style={{ backgroundColor: surface, borderColor: border, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 16, paddingTop: 0 }}>
                        <Text style={{ color: textPrimary, fontSize: 13, marginBottom: 12, fontWeight: '700' }}>Selecione o fornecedor para iniciar:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {suppliers.map(s => {
                                const isSelected = selectedSupplierId === s.id;
                                return (
                                    <TouchableOpacity
                                        key={s.id}
                                        testID="supplier-chip"
                                        style={[
                                            styles.chip,
                                            {
                                                borderColor: isSelected ? '#3b82f6' : border,
                                                backgroundColor: isSelected ? (isDarkMode ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.12)') : bg,
                                            }
                                        ]}
                                        onPress={() => setSelectedSupplierId(isSelected ? null : s.id)}
                                    >
                                        <Text style={{ color: isSelected ? '#2563eb' : textPrimary, fontWeight: isSelected ? '700' : '500' }}>
                                            {s.full_name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {selectedSupplierId && (
                          <TouchableOpacity
                            testID="continue-supplier-btn"
                            style={[styles.startSupplierButton, { backgroundColor: '#2563eb' }]}
                            onPress={() => void confirmDirectly('supplier', selectedSupplierId)}
                          >
                            <Text style={{ color: '#fff', fontWeight: '800' }}>Continuar com {suppliers.find(s => s.id === selectedSupplierId)?.full_name}</Text>
                          </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            <View style={{ marginBottom: expandedType === 'custom' ? 12 : 0 }}>
              <TouchableOpacity 
                style={[
                    styles.typeOption, 
                    { backgroundColor: surface, borderColor: border },
                    expandedType === 'custom' ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 } : {}
                ]} 
                onPress={() => setExpandedType(expandedType === 'custom' ? null : 'custom')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={[styles.typeIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)', marginBottom: 0 }]}>
                      <Filter size={24} color="#a855f7" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.typeTitle, { color: textPrimary }]}>Seleção Personalizada</Text>
                        <Text style={[styles.typeDesc, { color: muted }]}>Pesquise e adicione manualmente produtos ou variações específicas ao escopo.</Text>
                    </View>
                </View>
              </TouchableOpacity>
              {expandedType === 'custom' && (
                <View style={{ backgroundColor: surface, borderColor: border, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 16, paddingTop: 0 }}>
                  <Text style={{ color: muted, fontSize: 13, marginBottom: 12 }}>Selecione produtos ou variações antes de iniciar a contagem.</Text>
                  <TouchableOpacity style={styles.customAddButton} onPress={() => setSearchOpen(true)}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>+ Adicionar produto ou variação</Text>
                  </TouchableOpacity>
                  {customProducts.map(product => (
                    <View key={`${product.id}-${product.variation_id || 'main'}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: border }}>
                      <Text numberOfLines={2} style={{ color: textPrimary, flex: 1 }}>{product.name}</Text>
                      <TouchableOpacity onPress={() => setCustomProducts(current => current.filter(item => item.id !== product.id || item.variation_id !== product.variation_id))} accessibilityLabel={`Remover ${product.name}`}>
                        <X size={18} color={muted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    testID="continue-custom-btn"
                    style={[styles.startSupplierButton, { backgroundColor: '#7c3aed', opacity: customProducts.length ? 1 : 0.5 }]}
                    disabled={!customProducts.length}
                    onPress={() => void confirmDirectly('custom')}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800' }}>Continuar com {customProducts.length} item(ns)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
      </ScrollView>
      <InventoryProductSearchModal
        isDarkMode={isDarkMode}
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={product => setCustomProducts(current => current.some(item => item.id === product.id && item.variation_id === product.variation_id) ? current : [...current, product])}
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
  optionsContainer: { gap: 12 },
  typeOption: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  typeDesc: { fontSize: 13, lineHeight: 18 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  startSupplierButton: { alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 14 },
  customAddButton: { alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#7c3aed', marginBottom: 8 },
});

