import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { X, Search, Package, Users, Filter, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../../../../services/supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import { useInventoryScopeBuilder } from '../hooks/useInventoryScopeBuilder';
import type { ScopeConfiguration, ScopeProduct, ScopeSupplier, InventoryScopeType } from '../hooks/useInventoryScopeBuilder';

interface Props {
  isDarkMode: boolean;
  onCancel: () => void;
  onConfirm: (config: ScopeConfiguration) => void;
}

export const InventoryScopeScreen: React.FC<Props> = ({ isDarkMode, onCancel, onConfirm }) => {
  const { userProfile } = useAuth();
  const [allProducts, setAllProducts] = useState<ScopeProduct[]>([]);
  const [suppliers, setSuppliers] = useState<ScopeSupplier[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Custom Selection States
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ScopeProduct[]>([]);

  const {
    step,
    scopeType,
    inventoryName,
    setInventoryName,
    blindCount,
    setBlindCount,
    selectedSupplierId,
    setSelectedSupplierId,
    selectedResponsibleId,
    setSelectedResponsibleId,
    customProducts,
    setCustomProducts,
    matchingItems,
    handleNextStep,
  } = useInventoryScopeBuilder(allProducts, suppliers);

  // Load Initial Data
  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id, name, description, stock, unit, main_supplier_id'),
      supabase.from('people').select('id, full_name').eq('person_type', 'suppliers')
    ]).then(([prodRes, supRes]) => {
      if (prodRes.data) setAllProducts(prodRes.data as ScopeProduct[]);
      if (supRes.data) setSuppliers(supRes.data as ScopeSupplier[]);
      setLoadingData(false);
      if (userProfile?.id) {
          setSelectedResponsibleId(userProfile.id);
      }
    });
  }, [userProfile, setSelectedResponsibleId]);

  // Product Search
  useEffect(() => {
    if (productSearch.length < 2) {
      setProductResults([]);
      return;
    }
    const q = productSearch.toLowerCase();
    setProductResults(allProducts.filter(p => (p.name || p.description || '').toLowerCase().includes(q)).slice(0, 10));
  }, [productSearch, allProducts]);

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  const handleConfirm = () => {
    if (!inventoryName.trim()) {
        Alert.alert("Atenção", "Informe um nome para o inventário.");
        return;
    }
    if (scopeType === 'supplier' && !selectedSupplierId) {
        Alert.alert("Atenção", "Selecione um fornecedor.");
        return;
    }
    if (scopeType === 'custom' && customProducts.length === 0) {
        Alert.alert("Atenção", "Adicione produtos ao escopo.");
        return;
    }
    
    onConfirm({
        type: scopeType as InventoryScopeType,
        name: inventoryName.trim(),
        blindCount,
        responsibleId: selectedResponsibleId,
        itemsSnapshot: matchingItems
    });
  };

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
      <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Novo Inventário</Text>
          <Text style={[styles.headerSubtitle, { color: muted }]}>
            {step === 1 ? 'O que você deseja inventariar?' : 'Configuração do Escopo'}
          </Text>
        </View>
        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
          <X size={24} color={muted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {step === 1 && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[styles.typeOption, { backgroundColor: surface, borderColor: border }]} 
              onPress={() => handleNextStep('full')}
            >
              <View style={[styles.typeIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Package size={24} color="#10b981" />
              </View>
              <Text style={[styles.typeTitle, { color: textPrimary }]}>Estoque Completo</Text>
              <Text style={[styles.typeDesc, { color: muted }]}>Todas as variações ativas cadastradas no sistema.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.typeOption, { backgroundColor: surface, borderColor: border }]} 
              onPress={() => handleNextStep('supplier')}
            >
              <View style={[styles.typeIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Users size={24} color="#3b82f6" />
              </View>
              <Text style={[styles.typeTitle, { color: textPrimary }]}>Por Fornecedor</Text>
              <Text style={[styles.typeDesc, { color: muted }]}>Selecione um fornecedor e conte as variações relacionadas.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.typeOption, { backgroundColor: surface, borderColor: border }]} 
              onPress={() => handleNextStep('custom')}
            >
              <View style={[styles.typeIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <Filter size={24} color="#a855f7" />
              </View>
              <Text style={[styles.typeTitle, { color: textPrimary }]}>Seleção Personalizada</Text>
              <Text style={[styles.typeDesc, { color: muted }]}>Adicione manualmente produtos ou variações específicas ao escopo.</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.formContainer}>
            <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
              <Text style={[styles.label, { color: textPrimary }]}>Nome do Inventário</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: border, color: textPrimary }]}
                value={inventoryName}
                onChangeText={setInventoryName}
                placeholder="Ex: Inventário Mensal"
                placeholderTextColor={muted}
              />
            </View>

            {scopeType === 'supplier' && (
               <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                 <Text style={[styles.label, { color: textPrimary }]}>Selecione o Fornecedor</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {suppliers.map(s => (
                        <TouchableOpacity
                            key={s.id}
                            style={[
                                styles.chip, 
                                { borderColor: selectedSupplierId === s.id ? '#10b981' : border, backgroundColor: selectedSupplierId === s.id ? 'rgba(16,185,129,0.1)' : bg }
                            ]}
                            onPress={() => setSelectedSupplierId(s.id)}
                        >
                            <Text style={{ color: selectedSupplierId === s.id ? '#10b981' : textPrimary, fontWeight: selectedSupplierId === s.id ? '700' : '500' }}>
                                {s.full_name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                 </ScrollView>
               </View>
            )}

            {scopeType === 'custom' && (
              <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
                 <Text style={[styles.label, { color: textPrimary }]}>Adicionar Produtos</Text>
                 <View style={styles.searchRow}>
                    <Search size={20} color={muted} />
                    <TextInput
                        style={[styles.searchInput, { color: textPrimary }]}
                        value={productSearch}
                        onChangeText={setProductSearch}
                        placeholder="Buscar por nome..."
                        placeholderTextColor={muted}
                    />
                 </View>
                 {productResults.length > 0 && (
                     <View style={{ marginTop: 8, gap: 4 }}>
                         {productResults.map(p => (
                             <TouchableOpacity
                                key={p.id}
                                style={[styles.searchResultItem, { borderBottomColor: border }]}
                                onPress={() => {
                                    if (!customProducts.some(cp => cp.product.id === p.id)) {
                                        setCustomProducts(prev => [...prev, { product: p }]);
                                    }
                                    setProductSearch('');
                                }}
                             >
                                 <Text style={{ color: textPrimary }} numberOfLines={1}>{p.name}</Text>
                             </TouchableOpacity>
                         ))}
                     </View>
                 )}

                 {customProducts.length > 0 && (
                     <View style={{ marginTop: 16 }}>
                        <Text style={[styles.label, { color: textPrimary, fontSize: 12 }]}>Produtos Selecionados ({customProducts.length})</Text>
                        {customProducts.map((cp, idx) => (
                            <View key={idx} style={[styles.selectedItem, { backgroundColor: bg, borderColor: border }]}>
                                <Text style={{ color: textPrimary, flex: 1 }} numberOfLines={1}>{cp.product.name}</Text>
                                <TouchableOpacity onPress={() => setCustomProducts(prev => prev.filter((_, i) => i !== idx))}>
                                    <X size={16} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                     </View>
                 )}
              </View>
            )}

            <TouchableOpacity 
                style={[styles.card, { backgroundColor: surface, borderColor: border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setBlindCount(!blindCount)}
            >
                <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: textPrimary, marginBottom: 2 }]}>Contagem Cega</Text>
                    <Text style={{ color: muted, fontSize: 12 }}>Ocultar o estoque atual na hora da contagem.</Text>
                </View>
                {blindCount ? <CheckCircle2 size={24} color="#10b981" /> : <View style={[styles.circleEmpty, { borderColor: border }]} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmBtnText}>Confirmar e Iniciar</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    paddingTop: 50, // StatusBar compensation
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
    marginBottom: 12,
  },
  typeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  typeDesc: { fontSize: 13, lineHeight: 18 },
  formContainer: { gap: 16 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  searchResultItem: { paddingVertical: 12, borderBottomWidth: 1 },
  selectedItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 10, borderWidth: 1, borderRadius: 8, marginTop: 8
  },
  circleEmpty: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  confirmBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});
