import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSuppliers } from './useSuppliers';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const SuppliersScreen: React.FC<Props> = ({ isDarkMode, onBack, renderHeader }) => {
  const { suppliers, loadingMore, loadMore } = useSuppliers();
  const data: any[] = [
      { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
      ...suppliers.map(s => ({ type: 'ITEM', id: s.id, data: s }))
  ];



  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        stickyHeaderIndices={[0]}
        renderItem={({ item }) => {
            if (item.type === 'MODULE_HEADER') return renderHeader();
            const s = item.data;
            return (
                <View style={styles.cardContainer}>
                    <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]}>
                        <Text style={[styles.title, isDarkMode && styles.textDark]}>
                            {s.name}
                        </Text>
                        
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: '600' }}>
                                {s.documentNumber ? `📄 ${s.documentNumber}` : '📄 Sem Documento'}
                            </Text>
                            
                            {(s.city || s.state) && (
                                <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13 }}>
                                    📍 {s.city}{s.city && s.state ? ' - ' : ''}{s.state}
                                </Text>
                            )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
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
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
});
