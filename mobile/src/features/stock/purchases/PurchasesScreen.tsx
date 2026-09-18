import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Plus } from 'lucide-react-native';
import { usePurchases } from './usePurchases';
interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const PurchasesScreen: React.FC<Props> = ({ isDarkMode, onBack, renderHeader }) => {
  const { purchases, loadingMore, loadMore } = usePurchases();
  const data: any[] = [
      { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
      { type: 'PAGE_HEADER', id: 'PAGE_HEADER' },
      ...purchases.map(p => ({ type: 'ITEM', id: p.id, data: p }))
  ];

  const PageHeader = () => (
    <View style={[[styles.pageHeader, isDarkMode && styles.pageHeaderDark], { justifyContent: 'flex-end' }]}>
        <TouchableOpacity style={styles.importBtn}>
            <Plus size={20} color="#ffffff" />
            <Text style={styles.importBtnText}>Novo Pedido</Text>
        </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        stickyHeaderIndices={[1]}
        renderItem={({ item }) => {
            if (item.type === 'MODULE_HEADER') return renderHeader();
            if (item.type === 'PAGE_HEADER') return <PageHeader />;
            const p = item.data;
            const formattedDate = new Date(p.issueDate || p.created_at || Date.now()).toLocaleDateString('pt-BR');
            const total = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.totalValue || 0);
            
            // Definição de cores e status
            const isDraft = p.status === 'draft';
            const isConfirmed = p.status === 'confirmed' || p.status === 'approved';
            
            return (
                <View style={styles.cardContainer}>
                    <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View>
                                <Text style={[styles.title, isDarkMode && styles.textDark]}>
                                    Pedido #{p.id.split('-')[0].toUpperCase()}
                                </Text>
                            </View>
                            <View style={[styles.badge, isDraft ? styles.badgeDraft : isConfirmed ? styles.badgeSuccess : styles.badgeInfo, isDarkMode && { opacity: 0.8 }]}>
                                <Text style={[styles.badgeText, isDraft ? styles.badgeTextDraft : isConfirmed ? styles.badgeTextSuccess : styles.badgeTextInfo]}>
                                    {isDraft ? 'Rascunho' : isConfirmed ? 'Confirmado' : p.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={{ marginTop: 12, gap: 6 }}>
                            <Text style={[styles.supplierName, isDarkMode && styles.textDark]}>
                                {p.supplierName}
                            </Text>
                            
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13 }}>
                                    📅 Criado em: {formattedDate}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12, textTransform: 'uppercase', fontWeight: '700' }}>
                                Valor Total
                            </Text>
                            <Text style={{ color: isDarkMode ? '#f8fafc' : '#0f172a', fontSize: 15, fontWeight: '800' }}>
                                {total}
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
  importBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  importBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  cardContainer: { paddingHorizontal: 16, paddingTop: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  title: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  supplierName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  badgeSuccess: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  badgeDraft: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  badgeInfo: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  badgeTextSuccess: { color: '#059669' },
  badgeTextDraft: { color: '#d97706' },
  badgeTextInfo: { color: '#1d4ed8' },
});

