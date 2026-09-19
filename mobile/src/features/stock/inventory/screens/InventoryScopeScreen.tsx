import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { X, Package, Users, Filter } from 'lucide-react-native';
import { supabase } from '../../../../services/supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
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
  const [expandedType, setExpandedType] = useState<InventoryScopeType | null>(null);

  // Load Initial Data
  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id, name, description, stock, unit, main_supplier_id').eq('deleted', false).eq('active', true),
      supabase.from('people').select('id, full_name').eq('person_type', 'suppliers')
    ]).then(([prodRes, supRes]) => {
      if (prodRes.data) setAllProducts(prodRes.data as ScopeProduct[]);
      if (supRes.data) setSuppliers(supRes.data as ScopeSupplier[]);
      setLoadingData(false);
    });
  }, []);

  const bg = isDarkMode ? '#0f172a' : '#f8fafc';
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  const confirmDirectly = (type: InventoryScopeType, supplierId?: string) => {
    const dateStr = new Date().toLocaleDateString('pt-BR', { month: 'long' });
    let name = '';
    if (type === 'full') name = `Inventário Geral - ${dateStr}`;
    else if (type === 'supplier') name = `Inventário por Fornecedor`;
    else name = `Inventário Personalizado`;

    const items: ScopeConfiguration['itemsSnapshot'] = [];
    
    const getSupplierNames = (product: ScopeProduct) => {
        if (!product.main_supplier_id) return 'Fábrica não informada';
        const supplier = suppliers.find(s => s.id === product.main_supplier_id);
        return supplier ? supplier.full_name : 'Fábrica não informada';
    };

    const addProduct = (product: ScopeProduct) => {
        const supplierName = getSupplierNames(product);
        items.push({
            productId: String(product.id),
            name: product.name || product.description || 'Produto',
            supplierNames: supplierName,
            assignedSupplier: supplierName.split(' / ')[0] || 'Sem fornecedor',
            systemStock: Number(product.stock ?? 0),
            unit: product.unit || 'UN',
        });
    };

    if (type === 'full') {
        for (const product of allProducts) addProduct(product);
    } else if (type === 'supplier' && supplierId) {
        const supplierProducts = allProducts.filter(p => p.main_supplier_id === supplierId);
        for (const product of supplierProducts) addProduct(product);
    }

    onConfirm({
        type,
        name,
        blindCount: false, // Padrão no mobile para ser mais ágil
        hasStages: type === 'full',
        responsibleId: userProfile?.id || '',
        supplierId,
        itemsSnapshot: type === 'custom' ? [] : items,
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
              onPress={() => confirmDirectly('full')}
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
                            {suppliers.map(s => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[ styles.chip, { borderColor: border, backgroundColor: bg } ]}
                                    onPress={() => confirmDirectly('supplier', s.id)}
                                >
                                    <Text style={{ color: textPrimary, fontWeight: '500' }}>{s.full_name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            <TouchableOpacity 
              style={[styles.typeOption, { backgroundColor: surface, borderColor: border }]} 
              onPress={() => confirmDirectly('custom')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={[styles.typeIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)', marginBottom: 0 }]}>
                    <Filter size={24} color="#a855f7" />
                  </View>
                  <View style={{ flex: 1 }}>
                      <Text style={[styles.typeTitle, { color: textPrimary }]}>Seleção Personalizada</Text>
                      <Text style={[styles.typeDesc, { color: muted }]}>Adicione produtos durante a contagem conforme necessário.</Text>
                  </View>
              </View>
            </TouchableOpacity>
          </View>
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
    paddingTop: 50,
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
});

