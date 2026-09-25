import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
} from 'lucide-react-native';
import { useStockMoves } from '../hooks/useStockMoves';
import { useStockMoveActions } from '../hooks/useStockMoveActions';
import { styles } from './stockMovesStyles';
import type { StockProductSelection } from '../domain/stockMoveTypes';
import { StockMove } from '../../types/stock.types';
import { useAuth } from '../../../../contexts/AuthContext';
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

type StockMoveListItem =
  | { type: 'MODULE_HEADER' | 'PAGE_HEADER' | 'EMPTY'; id: string }
  | { type: 'ERROR'; id: string; message: string }
  | { type: 'ITEM'; id: string; data: StockMove };

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

  const {
    editingMove, setEditingMove, savingEdit, moveToDelete, setMoveToDelete,
    isDeleting, requestReverse, confirmReverse, saveEdit,
  } = useStockMoveActions(() => goToPage(page));

  // Estados de Período
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Este Mês');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Estado do Produto Selecionado
  const [selectedProductName, setSelectedProductName] = useState('');

  const handleSelectProduct = (product: StockProductSelection) => {
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

  const data: StockMoveListItem[] = [
    { type: 'MODULE_HEADER', id: 'MODULE_HEADER' },
    { type: 'PAGE_HEADER', id: 'PAGE_HEADER' },
  ];
  if (error) data.push({ type: 'ERROR', id: 'ERROR', message: error });
  if (!error && !loading && moves.length === 0) data.push({ type: 'EMPTY', id: 'EMPTY' });
  data.push(...moves.map(move => ({ type: 'ITEM' as const, id: move.id, data: move })));

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
          if (item.type !== 'ITEM') return null;
          return (
            <View style={styles.cardContainer}>
              <StockMoveCard
                move={item.data}
                isDarkMode={isDarkMode}
                canManage={canManageStock}
                onEdit={setEditingMove}
                onReverse={requestReverse}
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
        onConfirm={confirmReverse}
      />

      <InventoryMoveEditModal
        isOpen={Boolean(editingMove)}
        move={editingMove}
        isDarkMode={isDarkMode}
        isSaving={savingEdit}
        onClose={() => !savingEdit && setEditingMove(null)}
        onSave={saveEdit}
      />
    </View>
  );
};
