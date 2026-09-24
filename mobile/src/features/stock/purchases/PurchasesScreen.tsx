import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { ChevronDown, Plus, RefreshCw, Search, X } from 'lucide-react-native';
import { usePurchases } from './usePurchases';
import { cancelMobilePurchase, MobilePurchase, PurchaseStatus, updateMobilePurchase } from './mobilePurchaseService';
import { PurchaseFormModal } from './PurchaseFormModal';
import { PurchaseDetailsModal } from './PurchaseDetailsModal';
import { fetchMobileSuppliers } from '../../products/services/mobileSupplierService';

interface Props { isDarkMode: boolean; onBack: () => void; renderHeader: () => React.ReactElement; }

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const date = (value?: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '—';

const statusMeta = (status: PurchaseStatus) => ({
  ordered: { label: 'Em Ordem', bg: '#fef3c7', color: '#b45309' },
  fulfilled: { label: 'Atendido', bg: '#d1fae5', color: '#047857' },
  cancelled: { label: 'Cancelado', bg: '#fee2e2', color: '#b91c1c' },
}[status]);

export const PurchasesScreen: React.FC<Props> = ({ isDarkMode, renderHeader }) => {
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [supplierName, setSupplierName] = useState('Todos os fornecedores');
  const [supplierModal, setSupplierModal] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState<MobilePurchase | null>(null);
  const { purchases, loading, loadingMore, error, hasMore, loadMore, reload } = usePurchases({ supplierId, search });

  const colors = { bg: isDarkMode ? '#0f172a' : '#f8fafc', surface: isDarkMode ? '#1e293b' : '#fff', border: isDarkMode ? '#334155' : '#e2e8f0', text: isDarkMode ? '#f8fafc' : '#0f172a', muted: isDarkMode ? '#94a3b8' : '#64748b' };

  useEffect(() => { if (supplierModal) void fetchMobileSuppliers().then(setSuppliers); }, [supplierModal]);
  const filteredSuppliers = useMemo(() => suppliers.filter(item => item.name.toLowerCase().includes(supplierSearch.toLowerCase())).slice(0, 40), [supplierSearch, suppliers]);

  const handleStatusChange = async (status: PurchaseStatus) => {
    if (!selected) return;
    try {
      if (status === 'cancelled') await cancelMobilePurchase(selected);
      else await updateMobilePurchase(selected.id, { status });
      setDetailsVisible(false);
      setSelected(null);
      await reload();
    } catch (cause: any) { Alert.alert('Não foi possível alterar o status', cause?.message || 'Tente novamente.'); }
  };

  const header = <View><View style={[styles.pageHeader, { backgroundColor: colors.bg, borderColor: colors.border }]}><View><Text style={[styles.pageTitle, { color: colors.text }]}>Pedidos de compra</Text><Text style={[styles.pageSubtitle, { color: colors.muted }]}>Produtos e variações</Text></View><TouchableOpacity style={styles.newButton} onPress={() => { setSelected(null); setFormVisible(true); }}><Plus size={17} color="#fff" /><Text style={styles.newButtonText}>Novo pedido</Text></TouchableOpacity></View><View style={[styles.filters, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.searchBox, { backgroundColor: colors.bg, borderColor: colors.border }]}><Search size={17} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} placeholder="Fornecedor ou número do pedido" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.text }]} />{search ? <TouchableOpacity onPress={() => setSearch('')}><X size={16} color={colors.muted} /></TouchableOpacity> : null}</View><TouchableOpacity onPress={() => setSupplierModal(true)} style={[styles.supplierFilter, { backgroundColor: colors.bg, borderColor: colors.border }]}><Text numberOfLines={1} style={{ color: supplierId ? colors.text : colors.muted, flex: 1 }}>{supplierName}</Text><ChevronDown size={17} color={colors.muted} /></TouchableOpacity>{supplierId ? <TouchableOpacity onPress={() => { setSupplierId(undefined); setSupplierName('Todos os fornecedores'); }}><Text style={styles.clearFilter}>Limpar fornecedor</Text></TouchableOpacity> : null}</View></View>;

  return <View style={[styles.container, { backgroundColor: colors.bg }]}><FlatList
    data={purchases}
    keyExtractor={item => item.id}
    ListHeaderComponent={<View>{renderHeader()}{header}</View>}
    refreshControl={<RefreshControl refreshing={loading && purchases.length > 0} onRefresh={() => void reload()} tintColor="#2563eb" />}
    contentContainerStyle={styles.listContent}
    onEndReached={() => { if (hasMore) loadMore(); }}
    onEndReachedThreshold={0.5}
    ListEmptyComponent={loading ? <View style={styles.state}><ActivityIndicator size="large" color="#2563eb" /><Text style={{ color: colors.muted, marginTop: 10 }}>Carregando pedidos...</Text></View> : error ? <View style={[styles.state, { backgroundColor: isDarkMode ? '#451a03' : '#fff7ed', borderColor: '#fdba74' }]}><Text style={styles.errorTitle}>Não foi possível carregar os pedidos</Text><Text style={{ color: colors.muted, textAlign: 'center', marginTop: 5 }}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={() => void reload()}><RefreshCw size={15} color="#fff" /><Text style={styles.retryText}>Tentar novamente</Text></TouchableOpacity></View> : <View style={[styles.state, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>{supplierId || search ? 'Nenhum pedido encontrado' : 'Selecione ou crie um pedido'}</Text><Text style={{ color: colors.muted, textAlign: 'center', marginTop: 5 }}>{supplierId || search ? 'Ajuste os filtros para buscar novamente.' : 'Os pedidos de compra do ERP aparecem aqui.'}</Text></View>}
    renderItem={({ item }) => { const status = statusMeta(item.status); return <TouchableOpacity onPress={() => { setSelected(item); setDetailsVisible(true); }} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.cardTop}><View style={styles.cardCopy}><Text style={[styles.cardTitle, { color: colors.text }]}>Pedido #{item.purchaseNumber || item.id.slice(0, 8).toUpperCase()}</Text><Text style={[styles.meta, { color: colors.muted }]}>{date(item.date)} · {item.items.length} {item.items.length === 1 ? 'item' : 'itens'}</Text></View><View style={[styles.badge, { backgroundColor: status.bg }]}><Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text></View></View><Text numberOfLines={2} style={[styles.supplier, { color: colors.text }]}>{item.supplierName}</Text><View style={[styles.cardBottom, { borderColor: colors.border }]}><Text style={[styles.meta, { color: colors.muted }]}>{item.stockProcessed ? 'Estoque processado' : 'Aguardando recebimento'}</Text><Text style={styles.cardTotal}>{money(item.totalValue)}</Text></View></TouchableOpacity>; }}
    ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} /> : null}
  />
  <PurchaseFormModal visible={formVisible} isDarkMode={isDarkMode} purchase={selected} onClose={() => setFormVisible(false)} onSaved={() => void reload()} />
  <PurchaseDetailsModal visible={detailsVisible} isDarkMode={isDarkMode} purchase={selected} onClose={() => setDetailsVisible(false)} onEdit={() => { setDetailsVisible(false); setFormVisible(true); }} onStatusChange={status => void handleStatusChange(status)} />
  <Modal visible={supplierModal} animationType="slide" onRequestClose={() => setSupplierModal(false)}><View style={[styles.supplierModal, { backgroundColor: colors.bg }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.text }]}>Filtrar fornecedor</Text><TouchableOpacity onPress={() => setSupplierModal(false)}><X size={24} color={colors.text} /></TouchableOpacity></View><TextInput autoFocus value={supplierSearch} onChangeText={setSupplierSearch} placeholder="Buscar fornecedor" placeholderTextColor={colors.muted} style={[styles.modalSearch, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} /><FlatList data={filteredSuppliers} keyExtractor={item => item.id} contentContainerStyle={{ padding: 16, gap: 8 }} renderItem={({ item }) => <TouchableOpacity onPress={() => { setSupplierId(item.id); setSupplierName(item.name); setSupplierModal(false); }} style={[styles.supplierOption, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ color: colors.text, fontWeight: '800' }}>{item.name}</Text></TouchableOpacity>} ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', padding: 30 }}>Nenhum fornecedor encontrado.</Text>} /></View></Modal>
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1 }, listContent: { paddingBottom: 28 }, pageHeader: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, gap: 10 }, pageTitle: { fontSize: 17, fontWeight: '900' }, pageSubtitle: { fontSize: 11, marginTop: 3 }, newButton: { backgroundColor: '#2563eb', borderRadius: 10, minHeight: 40, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 }, newButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' }, filters: { padding: 12, borderBottomWidth: 1, gap: 9 }, searchBox: { minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 }, searchInput: { flex: 1, fontSize: 13 }, supplierFilter: { minHeight: 42, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }, clearFilter: { color: '#2563eb', fontSize: 12, fontWeight: '800', alignSelf: 'flex-end' }, card: { marginHorizontal: 14, marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 14 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, cardCopy: { flex: 1 }, cardTitle: { fontSize: 14, fontWeight: '900' }, supplier: { fontSize: 14, fontWeight: '800', marginTop: 13 }, meta: { fontSize: 11, marginTop: 4 }, badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 }, badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }, cardBottom: { marginTop: 13, paddingTop: 11, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardTotal: { color: '#059669', fontSize: 15, fontWeight: '900' }, state: { margin: 16, borderWidth: 1, borderRadius: 16, padding: 28, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontWeight: '900', fontSize: 15 }, errorTitle: { color: '#c2410c', fontWeight: '900', textAlign: 'center' }, retryButton: { marginTop: 14, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 5, alignItems: 'center' }, retryText: { color: '#fff', fontWeight: '900' }, supplierModal: { flex: 1 }, modalHeader: { padding: 18, paddingTop: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { fontSize: 19, fontWeight: '900' }, modalSearch: { marginHorizontal: 16, minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12 }, supplierOption: { borderWidth: 1, borderRadius: 11, padding: 14 },
});
