import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { InventoryCard } from '../components/InventoryCard';
import { useInventory } from '../hooks/useInventory';
import { InventorySession } from '../../types/stock.types';
import { InventoryAuditFlow } from './InventoryAuditFlow';

interface Props {
  isDarkMode: boolean;
  userProfile?: any;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const InventoryScreen: React.FC<Props> = ({ isDarkMode, userProfile, onBack, renderHeader }) => {
  const { sessions, loading, loadingMore, loadMore } = useInventory();
  const [showCount, setShowCount] = useState(false);

  if (showCount) {
    return <InventoryAuditFlow isDarkMode={isDarkMode} userProfile={userProfile} onClose={() => setShowCount(false)} />;
  }

  const PageHeader = () => (
    <View style={[styles.pageHeader, isDarkMode && styles.pageHeaderDark, { justifyContent: 'flex-end' }]}>
        <TouchableOpacity style={styles.startBtn} onPress={() => setShowCount(true)}>
            <ClipboardList size={18} color="#ffffff" />
            <Text style={styles.startBtnText}>Novo Inventário</Text>
        </TouchableOpacity>
    </View>
  );

  const data: any[] = [
      { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
      { type: 'PAGE_HEADER', id: 'PAGE_HEADER' },
      ...sessions.map(s => ({ type: 'ITEM', id: s.id, data: s }))
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        stickyHeaderIndices={[1]}
        renderItem={({ item }) => {
            if (item.type === 'MODULE_HEADER') return renderHeader();
            if (item.type === 'PAGE_HEADER') return <PageHeader />;
            return (
                <View style={styles.cardContainer}>
                    <InventoryCard session={item.data as InventorySession} isDarkMode={isDarkMode} />
                </View>
            );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
            <>
                {loadingMore && <ActivityIndicator size="small" color="#10b981" style={{ padding: 16 }} />}
                {!loading && sessions.length === 0 && (
                    <View style={{ padding: 32, alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                            <ClipboardList size={32} color={isDarkMode ? '#64748b' : '#94a3b8'} />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: isDarkMode ? '#f8fafc' : '#0f172a', marginBottom: 8 }}>Nenhum inventário ainda</Text>
                        <Text style={{ textAlign: 'center', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                            Toque no botão "Novo Inventário" para começar a auditar seu estoque.
                        </Text>
                    </View>
                )}
            </>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  pageHeaderDark: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8,
    shadowColor: '#10b981', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3
  },
  startBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  cardContainer: { paddingHorizontal: 16, paddingTop: 12 },
});
