import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TransactionsTabContent } from '../components/TransactionsTabContent';
import { TransactionFilterModal } from '../components/TransactionFilterModal';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { TransactionActionsModal } from '../components/TransactionActionsModal';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';
import { useFinanceHubData } from '../hooks/useFinanceHubData';

interface Props {
  userProfile?: any;
  isDarkMode?: boolean;
}

export const FinanceHubScreen: React.FC<Props> = ({
  userProfile,
  isDarkMode = false,
}) => {
  const hub = useFinanceHubData({ userProfile });

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <TransactionsTabContent
        selectedYear={hub.selectedYear}
        selectedMonth={hub.selectedMonth}
        summary={hub.summary}
        transactions={hub.transactions}
        loadingData={hub.loadingData}
        refreshing={hub.refreshing}
        typeFilter={hub.typeFilter}
        advancedFilters={hub.advancedFilters}
        isDarkMode={isDarkMode}
        onMonthChange={hub.handleMonthChange}
        onRefresh={hub.handleRefresh}
        onSelectTypeFilter={hub.setTypeFilter}
        onOpenFilterModal={() => hub.setShowFilterModal(true)}
        onSelectTransaction={hub.setSelectedTransaction}
        onOpenTransactionMenu={hub.setActionsTransaction}
        onOpenNewModal={() => {
          hub.setEditingTransaction(null);
          hub.setShowNewModal(true);
        }}
      />

      {/* Modais de Filtro, Cadastro, Ações e Detalhes */}
      <TransactionFilterModal
        visible={hub.showFilterModal}
        onClose={() => hub.setShowFilterModal(false)}
        categories={hub.categories}
        currentFilters={hub.advancedFilters}
        onApplyFilters={hub.setAdvancedFilters}
        isDarkMode={isDarkMode}
      />

      <NewTransactionModal
        visible={hub.showNewModal}
        onClose={() => {
          hub.setShowNewModal(false);
          hub.setEditingTransaction(null);
        }}
        categories={hub.categories}
        transaction={hub.editingTransaction}
        onSuccess={() => {
          hub.setEditingTransaction(null);
          hub.loadData(false);
        }}
        userName={hub.userName}
        isDarkMode={isDarkMode}
      />

      <TransactionActionsModal
        visible={Boolean(hub.actionsTransaction)}
        transaction={hub.actionsTransaction}
        isDarkMode={isDarkMode}
        onClose={() => hub.setActionsTransaction(null)}
        onEdit={tx => {
          hub.setActionsTransaction(null);
          hub.setEditingTransaction(tx);
          hub.setShowNewModal(true);
        }}
        onDeleted={() => hub.loadData(false)}
      />

      <TransactionDetailsModal
        visible={Boolean(hub.selectedTransaction)}
        transaction={hub.selectedTransaction}
        onClose={() => hub.setSelectedTransaction(null)}
        onSuccess={() => hub.loadData(false)}
        canReverse={hub.isAdmin}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
});
