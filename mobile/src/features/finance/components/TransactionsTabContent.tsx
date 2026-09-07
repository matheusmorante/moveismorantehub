import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Plus } from 'lucide-react-native';
import { MonthCarouselSelector } from '../components/MonthCarouselSelector';
import { MonthSummaryCard } from '../components/MonthSummaryCard';
import { TransactionFilterBar } from '../components/TransactionFilterBar';
import { TransactionListGrouped } from '../components/TransactionListGrouped';
import {
  FinancialCategory,
  FinancialTransaction,
  MonthlySummary,
  TransactionFilterOptions,
} from '../../../services/mobileFinanceService';

interface Props {
  selectedYear: number;
  selectedMonth: number;
  summary: MonthlySummary;
  transactions: FinancialTransaction[];
  loadingData: boolean;
  refreshing: boolean;
  typeFilter: 'all' | 'income' | 'expense';
  advancedFilters: TransactionFilterOptions;
  isDarkMode?: boolean;
  onMonthChange: (year: number, month: number) => void;
  onRefresh: () => void;
  onSelectTypeFilter: (type: 'all' | 'income' | 'expense') => void;
  onOpenFilterModal: () => void;
  onSelectTransaction: (tx: FinancialTransaction) => void;
  onOpenTransactionMenu: (tx: FinancialTransaction) => void;
  onOpenNewModal: () => void;
}

export const TransactionsTabContent: React.FC<Props> = ({
  selectedYear,
  selectedMonth,
  summary,
  transactions,
  loadingData,
  refreshing,
  typeFilter,
  advancedFilters,
  isDarkMode,
  onMonthChange,
  onRefresh,
  onSelectTypeFilter,
  onOpenFilterModal,
  onSelectTransaction,
  onOpenTransactionMenu,
  onOpenNewModal,
}) => {
  return (
    <View style={styles.container}>
      {/* Seletor de Mês Horizontal */}
      <MonthCarouselSelector
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
        isDarkMode={isDarkMode}
      />

      <ScrollView
        style={styles.scrollArea}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumo do Mês */}
        <MonthSummaryCard
          income={summary.income}
          expense={summary.expense}
          balance={summary.balance}
          isDarkMode={isDarkMode}
        />

        {/* Barra de Filtros */}
        <TransactionFilterBar
          activeTypeFilter={typeFilter}
          onSelectTypeFilter={onSelectTypeFilter}
          onOpenAdvancedFilters={onOpenFilterModal}
          hasActiveAdvancedFilters={Boolean(
            advancedFilters.categoryId ||
            advancedFilters.paymentMethod ||
            (advancedFilters as any).accountId ||
            advancedFilters.searchQuery
          )}
          isDarkMode={isDarkMode}
        />

        {/* Lista de Transações Agrupadas por Data */}
        {loadingData ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#3b82f6" size="large" />
          </View>
        ) : (
          <TransactionListGrouped
            transactions={transactions}
            onSelectTransaction={onSelectTransaction}
            onOpenTransactionMenu={onOpenTransactionMenu}
            isDarkMode={isDarkMode}
          />
        )}
      </ScrollView>

      {/* Botão Flutuante + Nova Transação */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={onOpenNewModal}
        activeOpacity={0.85}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.fabText}>Nova Transação</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    gap: 6,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
