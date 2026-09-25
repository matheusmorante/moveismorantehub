import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, Alert } from 'react-native';
import { ArrowDownAZ, ArrowUpAZ, ArrowDownWideNarrow, ArrowUpWideNarrow, Clock3, Plus, Search, X, RefreshCw, MoreVertical } from 'lucide-react-native';
import { useSuppliers } from './useSuppliers';
import { SupplierFormModal } from './SupplierFormModal';
import { SupplierPurchaseHistoryModal } from './SupplierPurchaseHistoryModal';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const SuppliersScreen: React.FC<Props> = ({ isDarkMode, renderHeader }) => {
  const { suppliers, productCounts, productCountErrors, loading, loadingMore, error, loadMore, reload, saveSupplier, moveToTrash, retryProductCount, search, setSearch, sortBy, setSortBy, sortOrder, setSortOrder, activeOnly, setActiveOnly } = useSuppliers();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historySupplier, setHistorySupplier] = useState<any>(null);
  const colors = isDarkMode
    ? { bg: '#0f172a', surface: '#1e293b', border: '#334155', text: '#f8fafc', muted: '#94a3b8' }
    : { bg: '#f8fafc', surface: '#ffffff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b' };

  const openForm = (supplier?: any) => { setSelectedSupplier(supplier || null); setModalVisible(true); };
  const showActions = (supplier: any) => Alert.alert(supplier.name, 'Ações do fornecedor', [
    { text: 'Editar', onPress: () => openForm(supplier) },
    { text: 'Mover para Lixeira', style: 'destructive', onPress: () => Alert.alert('Mover para Lixeira', `Mover “${supplier.name}” para a lixeira?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Mover', style: 'destructive', onPress: () => void moveToTrash(String(supplier.id)).catch((err: any) => Alert.alert('Não foi possível mover para a lixeira', err?.message || 'Tente novamente.')) },
    ]) },
    { text: 'Cancelar', style: 'cancel' },
  ]);
  const cycleSort = () => {
    if (sortBy === 'full_name' && sortOrder === 'asc') setSortOrder('desc');
    else if (sortBy === 'full_name') { setSortBy('created_at'); setSortOrder('asc'); }
    else if (sortOrder === 'asc') setSortOrder('desc');
    else { setSortBy('full_name'); setSortOrder('asc'); }
  };
  const sortLabel = sortBy === 'full_name' ? (sortOrder === 'asc' ? 'Nome A–Z' : 'Nome Z–A') : (sortOrder === 'asc' ? 'Mais antigos' : 'Mais recentes');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={suppliers}
        keyExtractor={item => String(item.id)}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading && suppliers.length > 0} onRefresh={() => void reload()} tintColor="#2563eb" />}
        ListHeaderComponent={
          <View style={{ backgroundColor: colors.bg }}>
            {renderHeader()}
            <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
              <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Search size={17} color={colors.muted} />
                <TextInput value={search} onChangeText={setSearch} placeholder="Pesquisar fornecedor por nome, razão social ou CPF/CNPJ" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.text }]} returnKeyType="search" />
                {search ? <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Limpar busca" style={styles.iconButton}><X size={17} color={colors.muted} /></TouchableOpacity> : null}
              </View>
              <View style={styles.toolbarActions}>
                <TouchableOpacity onPress={cycleSort} style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={`Ordenação: ${sortLabel}. Toque para alterar`}>
                  {sortBy === 'full_name' ? (sortOrder === 'asc' ? <ArrowDownAZ size={18} color="#2563eb" /> : <ArrowUpAZ size={18} color="#2563eb" />) : (sortOrder === 'asc' ? <ArrowUpWideNarrow size={18} color="#2563eb" /> : <ArrowDownWideNarrow size={18} color="#2563eb" />)}
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{sortLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openForm()} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Novo Fornecedor">
                  <Plus size={17} color="#fff" /><Text style={styles.addButtonText}>Novo</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.statusFilters}>
                {([{ label: 'Todos', value: undefined }, { label: 'Ativos', value: true }, { label: 'Inativos', value: false }] as const).map(option => {
                  const selected = activeOnly === option.value;
                  return <TouchableOpacity key={option.label} onPress={() => setActiveOnly(option.value)} style={[styles.statusChip, { backgroundColor: selected ? '#dbeafe' : colors.surface, borderColor: selected ? '#93c5fd' : colors.border }]} accessibilityRole="button" accessibilityState={{ selected }}><Text style={{ color: selected ? '#1d4ed8' : colors.muted, fontSize: 11, fontWeight: '800' }}>{option.label}</Text></TouchableOpacity>;
                })}
              </View>
            </View>
          </View>
        }
        renderItem={({ item: s }) => {
          const pCount = productCounts[String(s.id)];
          return (
            <View style={styles.cardContainer}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Editar ${s.name}`} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, !s.active && styles.inactiveCard]} onPress={() => openForm(s)}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.text }]}>{s.name}</Text>
                    {s.personType === 'PF' && s.socialName ? <Text style={[styles.subtitle, { color: colors.muted }]}>{s.socialName}</Text> : null}
                    {s.personType === 'PJ' && s.tradeName ? <Text style={[styles.subtitle, { color: colors.muted }]}>{s.tradeName}</Text> : null}
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={event => { event.stopPropagation(); setHistorySupplier(s); setHistoryVisible(true); }} style={styles.historyButton} accessibilityRole="button" accessibilityLabel={`Histórico de pedidos de ${s.name}`}>
                      <Clock3 size={17} color="#d97706" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={event => { event.stopPropagation(); showActions(s); }} style={styles.historyButton} accessibilityRole="button" accessibilityLabel={`Mais ações para ${s.name}`}>
                      <MoreVertical size={17} color={colors.muted} />
                    </TouchableOpacity>
                    <View style={[styles.badge, { backgroundColor: s.active ? '#dcfce7' : '#f1f5f9' }]}><Text style={{ color: s.active ? '#15803d' : '#64748b', fontSize: 9, fontWeight: '900' }}>{s.active ? 'ATIVO' : 'INATIVO'}</Text></View>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', flex: 1 }}>{s.documentNumber || 'CPF/CNPJ não informado'}</Text>
                  <TouchableOpacity onPress={event => { event.stopPropagation(); if (productCountErrors[String(s.id)]) void retryProductCount(String(s.id)); }} disabled={!productCountErrors[String(s.id)]} style={styles.productCount} accessibilityRole="button" accessibilityLabel={productCountErrors[String(s.id)] ? `Tentar carregar a contagem de produtos de ${s.name}` : `${pCount ?? 'Carregando'} produtos vinculados`}>
                    <Text style={styles.productCountText}>{pCount === undefined ? (productCountErrors[String(s.id)] ? 'Tentar contagem' : '… produtos') : `${pCount} ${pCount === 1 ? 'produto' : 'produtos'}`}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.45}
        ListEmptyComponent={loading ? <View style={styles.state}><ActivityIndicator size="large" color="#2563eb" /><Text style={{ color: colors.muted, marginTop: 10 }}>Carregando fornecedores...</Text></View> : error ? <View style={styles.state}><Text style={[styles.stateTitle, { color: colors.text }]}>Não foi possível carregar</Text><Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={() => void reload()}><RefreshCw size={15} color="#fff"/><Text style={styles.addButtonText}>Tentar novamente</Text></TouchableOpacity></View> : <View style={styles.state}><Text style={[styles.stateTitle, { color: colors.text }]}>{search || activeOnly !== undefined ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}</Text><Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>{search || activeOnly !== undefined ? 'Ajuste a busca ou o filtro de status.' : 'Cadastre o primeiro fornecedor para começar.'}</Text></View>}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#2563eb" style={{ padding: 18 }} /> : null}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
      />
      <SupplierFormModal visible={modalVisible} onClose={() => setModalVisible(false)} isDarkMode={isDarkMode} supplier={selectedSupplier} onSave={saveSupplier} />
      <SupplierPurchaseHistoryModal visible={historyVisible} supplier={historySupplier} isDarkMode={isDarkMode} onClose={() => setHistoryVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, gap: 9 },
  searchBox: { minHeight: 40, borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, minHeight: 40, fontSize: 12, paddingVertical: 6 },
  iconButton: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  toolbarActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  sortButton: { minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 7 },
  addButton: { minHeight: 40, paddingHorizontal: 14, backgroundColor: '#2563eb', borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  statusFilters: { flexDirection: 'row', gap: 7 },
  statusChip: { minHeight: 34, minWidth: 60, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 17 },
  cardContainer: { paddingHorizontal: 14, paddingTop: 10 },
  card: { borderRadius: 13, padding: 14, borderWidth: 1, marginBottom: 2 },
  inactiveCard: { opacity: 0.62 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  historyButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#fffbeb' },
  title: { fontSize: 14, fontWeight: '800' },
  subtitle: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e8f0', paddingTop: 9, marginTop: 10, gap: 6 },
  productCount: { backgroundColor: '#eff6ff', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  productCountText: { color: '#2563eb', fontSize: 11, fontWeight: '800' },
  state: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  stateTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#2563eb', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10, marginTop: 14 },
});
