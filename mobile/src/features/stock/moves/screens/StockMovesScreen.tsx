import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
} from 'lucide-react-native';
import { useStockMoves } from '../hooks/useStockMoves';
import { StockMove } from '../../types/stock.types';
import { useAuth } from '../../../../contexts/AuthContext';
import { reverseStockMove, updateStockMove } from '../../../../services/stock/stockMovesService';
import { isOrderLinked } from '../domain/inventoryTimelineBalance';
import {
  StockMoveCard,
  StockProductSearchFilter,
  StockBalanceBadge,
} from '../components';
import {
  InventoryMoveDeleteModal,
  InventoryMoveEditModal,
  StockPeriodModal,
} from '../modals';

interface Props {
  isDarkMode: boolean;
  onBack: () => void;
  renderHeader: () => React.ReactElement;
}

export const StockMovesScreen: React.FC<Props> = ({ isDarkMode, onBack, renderHeader }) => {
  const {
    moves,
    loading,
    error,
    page,
    totalPages,
    goToPage,
    setProductId,
    setVariationId,
    currentStock,
    setCurrentStock,
    changePeriod,
  } = useStockMoves();

  const { canManageStock } = useAuth();

  // Estados dos Modais
  const [editingMove, setEditingMove] = useState<StockMove | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [moveToDelete, setMoveToDelete] = useState<StockMove | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados de Período
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Este Mês');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Estado do Produto Selecionado
  const [selectedProductName, setSelectedProductName] = useState('');

  const handleSelectProduct = (product: any) => {
    setProductId(product.id);
    setVariationId(product.variation_id);
    setSelectedProductName(product.variationName || product.name || 'Variação não identificada');
    if (product.stock !== undefined && product.stock !== null) {
      setCurrentStock(Number(product.stock));
    }
  };

  const handleClearProduct = () => {
    setProductId(undefined);
    setVariationId(undefined);
    setSelectedProductName('');
    setCurrentStock(null);
  };

  const handleRequestReverse = (move: StockMove) => {
    if (isOrderLinked(move as any)) {
      Alert.alert(
        'Estorno bloqueado',
        'Esta movimentação pertence a um pedido e seu estorno ocorre pelo status do pedido.'
      );
      return;
    }
    setMoveToDelete(move);
  };

  const handleConfirmReverse = async (reason: string) => {
    if (!moveToDelete?.id) return;
    setIsDeleting(true);
    try {
      await reverseStockMove(moveToDelete.id, reason);
      Alert.alert('Sucesso', 'Movimentação estornada com sucesso.');
      setMoveToDelete(null);
      goToPage(page);
    } catch (e) {
      Alert.alert('Não foi possível estornar', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async (updates: {
    type: 'entry' | 'withdrawal' | 'balance';
    quantity: number;
    date: string;
    observation: string;
  }) => {
    if (!editingMove) return;
    setSavingEdit(true);
    try {
      await updateStockMove(editingMove.id, updates);
      setEditingMove(null);
      Alert.alert('Sucesso', 'Movimentação atualizada com sucesso.');
      goToPage(page);
    } catch (e) {
      Alert.alert('Não foi possível salvar', e instanceof Error ? e.message : 'Tente novamente.');
    } finally {
      setSavingEdit(false);
    }
  };

  const PageHeader = () => (
    <View style={[styles.pageHeaderWrapper, isDarkMode && styles.pageHeaderWrapperDark]}>
      <View style={styles.pageHeader}>
        <TouchableOpacity
          style={[styles.periodBtn, isDarkMode && styles.periodBtnDark]}
          onPress={() => setShowPeriodModal(true)}
        >
          <View style={styles.periodBtnLeft}>
            <Calendar size={16} color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
            <Text style={[styles.periodLabel, isDarkMode && styles.textMutedDark]}>Período:</Text>
          </View>
          <View style={[styles.periodValueWrapper, isDarkMode && styles.periodValueWrapperDark]}>
            <Text style={[styles.periodValue, isDarkMode && styles.textDark]}>{selectedPeriod}</Text>
            <ChevronDown size={14} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        <StockProductSearchFilter
          isDarkMode={isDarkMode}
          selectedProductName={selectedProductName}
          onSelectProduct={handleSelectProduct}
          onClearProduct={handleClearProduct}
        />
        {Boolean(selectedProductName) && (
          <StockBalanceBadge currentStock={currentStock} isDarkMode={isDarkMode} />
        )}
      </View>
    </View>
  );

  const data: any[] = [
    { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
    { type: 'PAGE_HEADER', id: 'PAGE_HEADER' },
    ...(error ? [{ type: 'ERROR', id: 'ERROR', message: error }] : []),
    ...(!error && !loading && moves.length === 0 ? [{ type: 'EMPTY', id: 'EMPTY' }] : []),
    ...moves.map(m => ({ type: 'ITEM', id: m.id, data: m })),
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        stickyHeaderIndices={[0]}
        renderItem={({ item }) => {
          if (item.type === 'MODULE_HEADER') return renderHeader();
          if (item.type === 'PAGE_HEADER') return <PageHeader />;
          if (item.type === 'ERROR')
            return (
              <View style={[styles.emptyState, isDarkMode && styles.emptyStateDark]}>
                <Text style={styles.errorTitle}>Não foi possível carregar as movimentações</Text>
                <Text style={styles.errorMessage}>{item.message}</Text>
              </View>
            );
          if (item.type === 'EMPTY')
            return (
              <View style={[styles.emptyState, isDarkMode && styles.emptyStateDark]}>
                <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
                  Nenhuma movimentação encontrada
                </Text>
                <Text style={styles.emptyMessage}>
                  Não foram localizadas movimentações para os filtros selecionados.
                </Text>
              </View>
            );
          return (
            <View style={styles.cardContainer}>
              <StockMoveCard
                move={item.data as StockMove}
                isDarkMode={isDarkMode}
                canManage={canManageStock}
                onEdit={setEditingMove}
                onReverse={handleRequestReverse}
              />
            </View>
          );
        }}
        ListFooterComponent={
          <View style={[styles.paginationContainer, isDarkMode && styles.paginationContainerDark]}>
            {loading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    page === 0 && styles.pageBtnDisabled,
                    isDarkMode && styles.pageBtnDark,
                  ]}
                  disabled={page === 0}
                  onPress={() => goToPage(page - 1)}
                >
                  <ChevronLeft
                    size={20}
                    color={
                      page === 0
                        ? isDarkMode
                          ? '#475569'
                          : '#94a3b8'
                        : isDarkMode
                        ? '#cbd5e1'
                        : '#334155'
                    }
                  />
                </TouchableOpacity>

                <Text style={[styles.pageText, isDarkMode && styles.textDark]}>
                  Página {page + 1} de {Math.max(1, totalPages)}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    page >= totalPages - 1 && styles.pageBtnDisabled,
                    isDarkMode && styles.pageBtnDark,
                  ]}
                  disabled={page >= totalPages - 1}
                  onPress={() => goToPage(page + 1)}
                >
                  <ChevronRight
                    size={20}
                    color={
                      page >= totalPages - 1
                        ? isDarkMode
                          ? '#475569'
                          : '#94a3b8'
                        : isDarkMode
                        ? '#cbd5e1'
                        : '#334155'
                    }
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
      />

      <StockPeriodModal
        visible={showPeriodModal}
        isDarkMode={isDarkMode}
        selectedPeriod={selectedPeriod}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onSelectPeriod={p => {
          setSelectedPeriod(p);
          changePeriod(p);
        }}
        onChangeCustomStartDate={setCustomStartDate}
        onChangeCustomEndDate={setCustomEndDate}
        onApplyCustomPeriod={range => {
          changePeriod('Personalizado', range);
        }}
        onClose={() => setShowPeriodModal(false)}
      />

      <InventoryMoveDeleteModal
        isOpen={Boolean(moveToDelete)}
        move={moveToDelete}
        isDarkMode={isDarkMode}
        isDeleting={isDeleting}
        onClose={() => !isDeleting && setMoveToDelete(null)}
        onConfirm={handleConfirmReverse}
      />

      <InventoryMoveEditModal
        isOpen={Boolean(editingMove)}
        move={editingMove}
        isDarkMode={isDarkMode}
        isSaving={savingEdit}
        onClose={() => !savingEdit && setEditingMove(null)}
        onSave={handleSaveEdit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  textDark: { color: '#f8fafc' },
  textMutedDark: { color: '#94a3b8' },
  cardContainer: { paddingHorizontal: 16, paddingTop: 10 },
  pageHeaderWrapper: { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  pageHeaderWrapperDark: { backgroundColor: '#0f172a', borderBottomColor: '#1e293b' },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  periodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 8,
    height: 38,
    gap: 8,
    flex: 1,
  },
  periodBtnDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  periodBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  periodLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  periodValueWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  periodValueWrapperDark: { backgroundColor: '#0f172a' },
  periodValue: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  filtersContainer: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  paginationContainer: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  paginationContainerDark: { backgroundColor: '#0f172a' },
  paginationRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pageBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pageBtnDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  pageBtnDisabled: { opacity: 0.4, backgroundColor: '#f1f5f9' },
  pageText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  emptyState: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  emptyStateDark: { backgroundColor: 'rgba(124,45,18,0.2)', borderColor: '#9a3412' },
  errorTitle: { color: '#c2410c', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  errorMessage: { color: '#9a3412', fontSize: 12, marginTop: 6, textAlign: 'center' },
  emptyTitle: { color: '#334155', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  emptyMessage: { color: '#64748b', fontSize: 12, marginTop: 6, textAlign: 'center' },
});
