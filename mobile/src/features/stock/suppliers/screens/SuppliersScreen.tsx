import React, { useState } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  Text,
} from 'react-native';
import { Archive, Pencil, Trash2, X } from 'lucide-react-native';
import { useSuppliers } from '../hooks/useSuppliers';
import { SupplierFormModal } from '../modals/supplier-form/SupplierFormModal';
import { SupplierPurchaseHistoryModal } from '../modals/supplier-purchase-history/SupplierPurchaseHistoryModal';
import { styles } from './suppliersScreen.styles';
import { SupplierToolbar } from '../components/SupplierToolbar';
import { SupplierCard } from '../components/SupplierCard';
import { SupplierListEmptyState } from '../components/SupplierListStates';
import {
  canDeleteSupplier,
  getSupplierDeletionBlockers,
} from '../../../../../../shared-utils/supplierDeletion';

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
    supplierDeletionCounts,
    supplierDeletionCountLoading,
    loading,
    loadingMore,
    error,
    loadMore,
    reload,
    saveSupplier,
    moveToTrash,
    deleteSupplier,
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
  const [actionsSupplier, setActionsSupplier] = useState<any>(null);

  const colors = isDarkMode
    ? { bg: '#0f172a', surface: '#1e293b', border: '#334155', text: '#f8fafc', muted: '#94a3b8' }
    : { bg: '#f8fafc', surface: '#ffffff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b' };

  const openForm = (supplier?: any) => {
    setSelectedSupplier(supplier || null);
    setModalVisible(true);
  };

  const showActions = (supplier: any) => setActionsSupplier(supplier);

  const selectedSupplierId = String(actionsSupplier?.id || '');
  const selectedSupplierCounts = supplierDeletionCounts[selectedSupplierId];
  const selectedSupplierCountLoading = Boolean(supplierDeletionCountLoading[selectedSupplierId]);
  const selectedSupplierCountError = Boolean(productCountErrors[selectedSupplierId]);
  const selectedSupplierCanBeDeleted =
    !selectedSupplierCountLoading &&
    !selectedSupplierCountError &&
    canDeleteSupplier(selectedSupplierCounts);
  const selectedSupplierBlockers = getSupplierDeletionBlockers(selectedSupplierCounts);
  const selectedSupplierEligibilityMessage = selectedSupplierCountError
    ? 'Não foi possível verificar os vínculos. Tente novamente.'
    : selectedSupplierCountLoading || !selectedSupplierCounts
      ? 'Verificando os vínculos do fornecedor…'
      : selectedSupplierBlockers.length
        ? `Exclusão bloqueada: ${selectedSupplierBlockers.join(', ')}.`
      : 'Sem produtos, pedidos de compra, recebimentos, inventários registrados, notas fiscais ou indisponibilidades de estoque vinculados.';

  const confirmSupplierMoveToTrash = () => {
    const supplier = actionsSupplier;
    setActionsSupplier(null);
    if (!supplier) return;
    Alert.alert(
      'Mover para Lixeira?',
      `Mover “${supplier.name}” para a lixeira?`,
      [
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
      ]
    );
  };

  const confirmSupplierDeletion = () => {
    const supplier = actionsSupplier;
    setActionsSupplier(null);
    if (!supplier) return;
    Alert.alert(
      'Excluir fornecedor?',
      `A exclusão permanente de “${supplier.name}” não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () =>
            void deleteSupplier(String(supplier.id)).catch((err: any) =>
              Alert.alert(
                'Não foi possível excluir o fornecedor',
                err?.message || 'Atualize a lista e confira novamente os vínculos.'
              )
            ),
        },
      ]
    );
  };

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
            hasSupplierCountError={Boolean(productCountErrors[String(s.id)])}
            onEdit={openForm}
            onOpenHistory={(sup) => {
              setHistorySupplier(sup);
              setHistoryVisible(true);
            }}
            onShowActions={showActions}
            onRetrySupplierCounts={retryProductCount}
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
      <Modal
        transparent
        visible={Boolean(actionsSupplier)}
        animationType="fade"
        onRequestClose={() => setActionsSupplier(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 24,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar ações do fornecedor"
            onPress={() => setActionsSupplier(null)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              alignSelf: 'center',
              padding: 18,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>
                  {actionsSupplier?.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Ações do fornecedor
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                onPress={() => setActionsSupplier(null)}
                hitSlop={10}
              >
                <X size={20} color={colors.muted} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const supplier = actionsSupplier;
                setActionsSupplier(null);
                if (supplier) openForm(supplier);
              }}
              style={{
                minHeight: 48,
                borderRadius: 12,
                backgroundColor: colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Pencil size={16} color="#2563eb" />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>Editar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmSupplierMoveToTrash}
              style={{
                minHeight: 48,
                borderRadius: 12,
                backgroundColor: colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Archive size={16} color={colors.muted} />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                Mover para Lixeira
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedSupplierCanBeDeleted }}
              disabled={!selectedSupplierCanBeDeleted}
              onPress={confirmSupplierDeletion}
              style={{
                minHeight: 48,
                borderRadius: 12,
                backgroundColor: selectedSupplierCanBeDeleted ? '#fef2f2' : colors.bg,
                opacity: selectedSupplierCanBeDeleted ? 1 : 0.55,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <Trash2 size={17} color={selectedSupplierCanBeDeleted ? '#dc2626' : colors.muted} />
              <Text
                style={{
                  color: selectedSupplierCanBeDeleted ? '#b91c1c' : colors.muted,
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                Excluir fornecedor
              </Text>
            </Pressable>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              {selectedSupplierEligibilityMessage}
            </Text>
            {selectedSupplierCountError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void retryProductCount(selectedSupplierId)}
                style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
              >
                <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '700' }}>
                  Verificar novamente
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};
