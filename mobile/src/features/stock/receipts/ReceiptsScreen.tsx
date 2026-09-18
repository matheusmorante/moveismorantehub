import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Box } from 'lucide-react-native';
import { useReceipts } from './useReceipts';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const ReceiptsScreen: React.FC<Props> = ({ isDarkMode, onBack, renderHeader }) => {
  const { receipts, loading, loadingMore, loadMore } = useReceipts();
  const data: any[] = [
      { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
      ...receipts.map(r => ({ type: 'ITEM', id: r.id, data: r }))
  ];



  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        stickyHeaderIndices={[0]}
        renderItem={({ item }) => {
            if (item.type === 'MODULE_HEADER') return renderHeader();
            const r = item.data;
            const hasNF = Boolean(r.fiscal_key && r.fiscal_key.replace(/\\D/g, '').length === 44);
            const formattedDate = new Date(r.received_at || r.created_at).toLocaleDateString('pt-BR');
            const total = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.totalValue || 0);
            const isDraft = r.status === 'draft';
            const isEstornado = r.status === 'estornado';
            
            return (
                <View style={styles.cardContainer}>
                    <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View>
                                <Text style={[styles.title, isDarkMode && styles.textDark]}>
                                    Rec #{r.id.split('-')[0].toUpperCase()}
                                </Text>
                                <Text style={{ color: '#059669', fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                                    {r.items?.length || 0} itens recebidos
                                </Text>
                            </View>
                            <View style={[styles.badge, isDraft ? styles.badgeDraft : isEstornado ? styles.badgeError : styles.badgeSuccess, isDarkMode && { opacity: 0.8 }]}>
                                <Text style={[styles.badgeText, isDraft ? styles.badgeTextDraft : isEstornado ? styles.badgeTextError : styles.badgeTextSuccess]}>
                                    {isDraft ? 'Rascunho' : isEstornado ? 'Estornado' : 'Recebido'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={{ marginTop: 12, gap: 6 }}>
                            <Text style={[styles.supplierName, isDarkMode && styles.textDark]}>
                                {r.supplierName}
                            </Text>
                            
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13 }}>
                                    📅 {formattedDate}
                                </Text>
                                <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13 }}>
                                    {hasNF ? `📄 Com NF ${r.invoice_number ? `(${r.invoice_number})` : ''}` : '📄 Sem NF'}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12, textTransform: 'uppercase', fontWeight: '700' }}>
                                Total Recebido
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
        ListEmptyComponent={
            !loading && !loadingMore ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                    <Box size={48} color={isDarkMode ? '#334155' : '#cbd5e1'} style={{ marginBottom: 16 }} />
                    <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 16, fontWeight: '600' }}>
                        Nenhum recebimento encontrado.
                    </Text>
                </View>
            ) : null
        }
        ListFooterComponent={
            loadingMore || loading ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} /> : null
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
  title: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  supplierName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  badgeSuccess: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  badgeDraft: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  badgeError: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  badgeTextSuccess: { color: '#059669' },
  badgeTextDraft: { color: '#d97706' },
  badgeTextError: { color: '#dc2626' },
});

