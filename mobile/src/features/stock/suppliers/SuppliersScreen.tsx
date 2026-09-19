import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { useSuppliers } from './useSuppliers';
import { SupplierFormModal } from './SupplierFormModal';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const SuppliersScreen: React.FC<Props> = ({ isDarkMode, onBack, renderHeader }) => {
  const { suppliers, productCounts, loadingMore, loadMore, saveSupplier } = useSuppliers();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  const data: any[] = [
      { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
      ...suppliers.map(s => ({ type: 'ITEM', id: s.id, data: s }))
  ];

  const handleOpenForm = (supplier?: any) => {
    setSelectedSupplier(supplier || null);
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        stickyHeaderIndices={[0]}
        renderItem={({ item }) => {
            if (item.type === 'MODULE_HEADER') {
                return (
                    <View>
                        {renderHeader()}
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenForm()}>
                                <Plus size={20} color="#fff" />
                                <Text style={styles.addBtnText}>Novo Fornecedor</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            }
            const s = item.data;
            const pCount = productCounts[s.id] || 0;
            return (
                <View style={styles.cardContainer}>
                    <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]} onPress={() => handleOpenForm(s)}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Text style={[styles.title, isDarkMode && styles.textDark]}>
                                {s.name}
                            </Text>
                            <Text style={{ fontSize: 11, color: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 'bold' }}>
                                ID: {s.id}
                            </Text>
                        </View>
                        
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: '600' }}>
                                {s.documentNumber ? `📄 ${s.documentNumber}` : '📄 Sem Documento'}
                            </Text>
                            
                            <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13 }}>
                                📦 {pCount} {pCount === 1 ? 'Produto' : 'Produtos'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} /> : null
        }
      />
      <SupplierFormModal 
          visible={modalVisible} 
          onClose={() => setModalVisible(false)} 
          isDarkMode={isDarkMode} 
          supplier={selectedSupplier}
          onSave={saveSupplier}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  actionRow: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'flex-end' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  pageHeaderDark: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  backBtnDark: { backgroundColor: '#1e293b' },
  pageTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  textDark: { color: '#f8fafc' },
  cardContainer: { paddingHorizontal: 16, paddingTop: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
});
