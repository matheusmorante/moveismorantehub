import React, { useCallback, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import * as stockService from '../../../services/stockService';

interface Props { visible: boolean; supplier: any; isDarkMode: boolean; onClose: () => void }

export const SupplierPurchaseHistoryModal: React.FC<Props> = ({ visible, supplier, isDarkMode, onClose }) => {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalSpent, setTotalSpent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const colors = isDarkMode
    ? { bg: '#0f172a', surface: '#1e293b', border: '#334155', text: '#f8fafc', muted: '#94a3b8' }
    : { bg: '#f8fafc', surface: '#fff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b' };

  const load = useCallback(async (nextPage = 0) => {
    if (nextPage === 0) setLoading(true); else setLoadingMore(true);
    setError(false);
    try {
      const result = await stockService.fetchSupplierPurchaseHistory({ name: supplier?.name || supplier?.full_name || '', phone: supplier?.phone, email: supplier?.email }, nextPage);
      setItems(current => nextPage === 0 ? result.data : [...current, ...result.data]);
      setTotal(result.count);
      if (nextPage === 0) setTotalSpent(result.totalSpent ?? null);
      setPage(nextPage);
    } catch (e) {
      console.error('Erro ao carregar histórico de compras do fornecedor:', e);
      setError(true);
    } finally { setLoading(false); setLoadingMore(false); }
  }, [supplier?.id, supplier?.name, supplier?.full_name, supplier?.phone, supplier?.email]);

  useEffect(() => { if (visible && supplier?.id) void load(0); }, [visible, supplier?.id, load]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.text }]}>Histórico de Pedidos</Text><Text numberOfLines={1} style={[styles.subtitle, { color: colors.muted }]}>{supplier?.name || supplier?.full_name || 'Fornecedor'}</Text></View>
          <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Fechar histórico"><X size={22} color={colors.muted} /></TouchableOpacity>
        </View>
        <View style={[styles.summary, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View><Text style={{ color: colors.muted, fontSize: 9, fontWeight: '800' }}>TOTAL DE PEDIDOS</Text><Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 3 }}>{total}</Text></View>
          <View><Text style={{ color: colors.muted, fontSize: 9, fontWeight: '800' }}>VALOR TOTAL GASTO</Text><Text style={{ color: '#2563eb', fontSize: 14, fontWeight: '900', marginTop: 3 }}>{totalSpent === null ? '—' : totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text></View>
        </View>
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 14, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={() => void load(0)} tintColor="#2563eb" />}
          onEndReached={() => { if (!loading && !loadingMore && items.length < total) void load(page + 1); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={loading ? <View style={styles.state}><ActivityIndicator color="#2563eb" size="large" /><Text style={{ color: colors.muted, marginTop: 10 }}>Carregando histórico...</Text></View> : <View style={styles.state}><Text style={{ color: colors.text, fontWeight: '800' }}>{error ? 'Não foi possível carregar o histórico.' : 'Nenhum pedido encontrado para este fornecedor.'}</Text>{error ? <TouchableOpacity onPress={() => void load(0)} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></TouchableOpacity> : null}</View>}
          renderItem={({ item }) => (
            <View style={[styles.purchase, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.purchaseHeading}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>Pedido #{String(item.id).slice(-6).toUpperCase()}</Text>
                  <Text style={[styles.typeBadge, { color: item.order_type === 'assistance' ? '#c2410c' : '#2563eb', backgroundColor: item.order_type === 'assistance' ? '#ffedd5' : '#dbeafe' }]}>{item.order_type === 'assistance' ? 'ASSISTÊNCIA' : item.delivery_method === 'pickup' ? 'RETIRADA' : 'ENTREGA'}</Text>
                </View>
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}>{item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : 'Data não informada'} · {String(item.status || 'Sem status').toUpperCase()}</Text>
                <Text numberOfLines={2} style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>{(item.order_items || []).map((orderItem: any) => orderItem.description).filter(Boolean).join(', ') || 'Itens não informados'}</Text>
              </View>
              <Text style={{ color: '#2563eb', fontSize: 13, fontWeight: '900' }}>{Number(item.payments_total ?? item.total_amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text>
            </View>
          )}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#2563eb" style={{ padding: 15 }} /> : null}
        />
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}><TouchableOpacity style={styles.done} onPress={onClose}><Text style={styles.doneText}>Fechar</Text></TouchableOpacity></View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { paddingHorizontal: 17, paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '900' }, subtitle: { fontSize: 11, fontWeight: '600', marginTop: 3 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  summary: { paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  state: { flex: 1, minHeight: 180, justifyContent: 'center', alignItems: 'center', padding: 22 },
  purchase: { borderWidth: 1, borderRadius: 13, padding: 14, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  purchaseHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  typeBadge: { overflow: 'hidden', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, fontSize: 8, fontWeight: '900' },
  retry: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9 }, retryText: { color: '#fff', fontWeight: '800' },
  footer: { padding: 13, borderTopWidth: 1 }, done: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', borderRadius: 11 }, doneText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
