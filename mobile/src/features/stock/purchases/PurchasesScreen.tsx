import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  View,
} from 'react-native';
import { usePurchases } from './usePurchases';
import {
  cancelMobilePurchase,
  MobilePurchase,
  PurchaseStatus,
  updateMobilePurchase,
} from './mobilePurchaseService';
import { PurchaseFormModal } from './PurchaseFormModal';
import { PurchaseDetailsModal } from './PurchaseDetailsModal';
import { styles } from './screens/purchases-screen/purchasesScreen.styles';
import { PurchaseCard } from './screens/purchases-screen/PurchaseCard';
import { PurchasesListStates } from './screens/purchases-screen/PurchasesListStates';
import { PurchasesScreenHeader } from './screens/purchases-screen/PurchasesScreenHeader';
import { PurchaseSupplierFilterModal } from './screens/purchases-screen/PurchaseSupplierFilterModal';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const PurchasesScreen: React.FC<Props> = ({ isDarkMode, renderHeader }) => {
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [supplierName, setSupplierName] = useState('Todos os fornecedores');
  const [supplierModal, setSupplierModal] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState<MobilePurchase | null>(null);

  const { purchases, loading, loadingMore, error, hasMore, loadMore, reload } = usePurchases({
    supplierId,
    search,
  });

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    surface: isDarkMode ? '#1e293b' : '#fff',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    text: isDarkMode ? '#f8fafc' : '#0f172a',
    muted: isDarkMode ? '#94a3b8' : '#64748b',
  };

  const handleStatusChange = async (status: PurchaseStatus) => {
    if (!selected) return;
    try {
      if (status === 'cancelled') await cancelMobilePurchase(selected);
      else await updateMobilePurchase(selected.id, { status });
      setDetailsVisible(false);
      setSelected(null);
      await reload();
    } catch (cause: any) {
      Alert.alert('Não foi possível alterar o status', cause?.message || 'Tente novamente.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {renderHeader()}
            <PurchasesScreenHeader
              colors={colors}
              search={search}
              onSearchChange={setSearch}
              supplierId={supplierId}
              supplierName={supplierName}
              onOpenSupplierModal={() => setSupplierModal(true)}
              onClearSupplier={() => {
                setSupplierId(undefined);
                setSupplierName('Todos os fornecedores');
              }}
              onNewPurchase={() => {
                setSelected(null);
                setFormVisible(true);
              }}
            />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={loading && purchases.length > 0}
            onRefresh={() => void reload()}
            tintColor="#2563eb"
          />
        }
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (hasMore) loadMore();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <PurchasesListStates
            loading={loading}
            error={error}
            hasFilter={Boolean(supplierId || search)}
            colors={colors}
            isDarkMode={isDarkMode}
            onRetry={() => void reload()}
          />
        }
        renderItem={({ item }) => (
          <PurchaseCard
            item={item}
            colors={colors}
            onPress={() => {
              setSelected(item);
              setDetailsVisible(true);
            }}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ padding: 16 }} />
          ) : null
        }
      />
      <PurchaseFormModal
        visible={formVisible}
        isDarkMode={isDarkMode}
        purchase={selected}
        onClose={() => setFormVisible(false)}
        onSaved={() => void reload()}
      />
      <PurchaseDetailsModal
        visible={detailsVisible}
        isDarkMode={isDarkMode}
        purchase={selected}
        onClose={() => setDetailsVisible(false)}
        onEdit={() => {
          setDetailsVisible(false);
          setFormVisible(true);
        }}
        onStatusChange={(status) => void handleStatusChange(status)}
      />
      <PurchaseSupplierFilterModal
        visible={supplierModal}
        colors={colors}
        onClose={() => setSupplierModal(false)}
        onSelectSupplier={(supplier) => {
          setSupplierId(supplier.id);
          setSupplierName(supplier.name);
          setSupplierModal(false);
        }}
      />
    </View>
  );
};
