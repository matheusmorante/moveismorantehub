import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useSuppliers } from '../hooks/useSuppliers';
import { SupplierFormModal } from '../modals/supplier-form/SupplierFormModal';
import { SupplierPurchaseHistoryModal } from '../modals/SupplierPurchaseHistoryModal';
import { styles } from './suppliersScreen.styles';
import { SupplierToolbar } from '../components/SupplierToolbar';
import { SupplierCard } from '../components/SupplierCard';
import { SupplierListEmptyState } from '../components/SupplierListStates';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const SuppliersScreen: React.FC<Props> = ({ isDarkMode, renderHeader }) => {
  const {
    suppliers,
    productCounts,
    productCountErrors,
    loading,
    loadingMore,
    error,
    loadMore,
    reload,
    saveSupplier,
    moveToTrash,
    retryProductCount,
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    activeOnly,
    setActiveOnly,
  } = useSuppliers();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historySupplier, setHistorySupplier] = useState<any>(null);

  const colors = isDarkMode
    ? { bg: '#0f172a', surface: '#1e293b', border: '#334155', text: '#f8fafc', muted: '#94a3b8' }
    : { bg: '#f8fafc', surface: '#ffffff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b' };

  const openForm = (supplier?: any) => {
    setSelectedSupplier(supplier || null);
    setModalVisible(true);
  };

  const showActions = (supplier: any) =>
    Alert.alert(supplier.name, 'Ações do fornecedor', [
      { text: 'Editar', onPress: () => openForm(supplier) },
      {
        text: 'Mover para Lixeira',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Mover para Lixeira', `Mover “${supplier.name}” para a lixeira?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Mover',
              style: 'destructive',
              onPress: () =>
                void moveToTrash(String(supplier.id)).catch((err: any) =>
                  Alert.alert(
                    'Não foi possível mover para a lixeira',
                    err?.message || 'Tente novamente.'
                  )
                ),
            },
          ]),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);

  const cycleSort = () => {
    if (sortBy === 'full_name' && sortOrder === 'asc') setSortOrder('desc');
    else if (sortBy === 'full_name') {
      setSortBy('created_at');
      setSortOrder('asc');
    } else if (sortOrder === 'asc') setSortOrder('desc');
    else {
      setSortBy('full_name');
      setSortOrder('asc');
    }
  };

  const sortLabel =
    sortBy === 'full_name'
      ? sortOrder === 'asc'
        ? 'Nome A–Z'
        : 'Nome Z–A'
      : sortOrder === 'asc'
        ? 'Mais antigos'
        : 'Mais recentes';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={suppliers}
        keyExtractor={(item) => String(item.id)}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading && suppliers.length > 0}
            onRefresh={() => void reload()}
            tintColor="#2563eb"
          />
        }
        ListHeaderComponent={
          <View style={{ backgroundColor: colors.bg }}>
            {renderHeader()}
            <SupplierToolbar
              search={search}
              setSearch={setSearch}
              sortBy={sortBy}
              sortOrder={sortOrder}
              cycleSort={cycleSort}
              sortLabel={sortLabel}
              activeOnly={activeOnly}
              setActiveOnly={setActiveOnly}
              onOpenNewSupplier={() => openForm()}
              colors={colors}
            />
          </View>
        }
        renderItem={({ item: s }) => (
          <SupplierCard
            supplier={s}
            colors={colors}
            productCount={productCounts[String(s.id)]}
            hasProductCountError={Boolean(productCountErrors[String(s.id)])}
            onEdit={openForm}
            onOpenHistory={(sup) => {
              setHistorySupplier(sup);
              setHistoryVisible(true);
            }}
            onShowActions={showActions}
            onRetryProductCount={retryProductCount}
          />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.45}
        ListEmptyComponent={
          <SupplierListEmptyState
            loading={loading}
            error={error}
            search={search}
            activeOnly={activeOnly}
            onRetry={() => void reload()}
            colors={colors}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ padding: 18 }} />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
      />
      <SupplierFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        isDarkMode={isDarkMode}
        supplier={selectedSupplier}
        onSave={saveSupplier}
      />
      <SupplierPurchaseHistoryModal
        visible={historyVisible}
        supplier={historySupplier}
        isDarkMode={isDarkMode}
        onClose={() => setHistoryVisible(false)}
      />
    </View>
  );
};
