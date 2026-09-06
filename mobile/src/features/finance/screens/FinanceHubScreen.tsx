import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Plus, SlidersHorizontal, Bot, Receipt, CalendarClock } from 'lucide-react-native';
import { MonthCarouselSelector } from '../components/MonthCarouselSelector';
import { MonthSummaryCard } from '../components/MonthSummaryCard';
import { TransactionFilterBar } from '../components/TransactionFilterBar';
import { TransactionFilterModal } from '../components/TransactionFilterModal';
import { TransactionListGrouped } from '../components/TransactionListGrouped';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';
import { FinancialAiChatView } from '../components/FinancialAiChatView';
import { PayableAccountsView } from '../components/PayableAccountsView';
import {
  FinancialCategory,
  FinancialTransaction,
  MonthlySummary,
  TransactionFilterOptions,
  fetchFinancialCategories,
  fetchMonthlySummary,
  fetchTransactionsForMonth,
} from '../../../services/mobileFinanceService';

interface Props {
  userProfile?: any;
  isDarkMode?: boolean;
}

export const FinanceHubScreen: React.FC<Props> = ({
  userProfile,
  isDarkMode = false,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12

  const [activeTab, setActiveTab] = useState<'transactions' | 'payable' | 'assistant'>('transactions');

  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({ income: 0, expense: 0, balance: 0 });
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [advancedFilters, setAdvancedFilters] = useState<TransactionFilterOptions>({});
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);

  const userName = userProfile?.full_name || userProfile?.name || 'Operador';
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'master';

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoadingData(true);
    try {
      const [cats, sum, list] = await Promise.all([
        fetchFinancialCategories(),
        fetchMonthlySummary(selectedYear, selectedMonth),
        fetchTransactionsForMonth(selectedYear, selectedMonth, {
          type: typeFilter,
          ...advancedFilters,
        }),
      ]);
      setCategories(cats);
      setSummary(sum);
      setTransactions(list);
    } catch (e) {
      console.warn('Erro ao carregar dados do módulo financeiro:', e);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [selectedYear, selectedMonth, typeFilter, advancedFilters]);

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Navegação por Abas Principais: [ Transações ] [ A pagar ] [ Assistente ] */}
      <View style={[styles.topTabsBar, isDarkMode && styles.topTabsBarDark]}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'transactions' && styles.activeTopTabBtn]}
          onPress={() => setActiveTab('transactions')}
          activeOpacity={0.7}
        >
          <Receipt size={15} color={activeTab === 'transactions' ? '#3b82f6' : isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text
            style={[
              styles.topTabText,
              activeTab === 'transactions' && styles.activeTopTabText,
              isDarkMode && activeTab !== 'transactions' && styles.topTabTextDark,
            ]}
          >
            Transações
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'payable' && styles.activeTopTabBtn]}
          onPress={() => setActiveTab('payable')}
          activeOpacity={0.7}
        >
          <CalendarClock size={15} color={activeTab === 'payable' ? '#d97706' : isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text
            style={[
              styles.topTabText,
              activeTab === 'payable' && styles.activeTopTabTextPayable,
              isDarkMode && activeTab !== 'payable' && styles.topTabTextDark,
            ]}
          >
            A pagar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'assistant' && styles.activeTopTabBtn]}
          onPress={() => setActiveTab('assistant')}
          activeOpacity={0.7}
        >
          <Bot size={15} color={activeTab === 'assistant' ? '#7c3aed' : isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text
            style={[
              styles.topTabText,
              activeTab === 'assistant' && styles.activeTopTabTextAssistant,
              isDarkMode && activeTab !== 'assistant' && styles.topTabTextDark,
            ]}
          >
            Assistente
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO DAS ABAS */}
      {activeTab === 'transactions' ? (
        <View style={{ flex: 1 }}>
          {/* Seletor de Mês Horizontal */}
          <MonthCarouselSelector
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            isDarkMode={isDarkMode}
          />

          <ScrollView
            style={styles.scrollArea}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
              onSelectTypeFilter={setTypeFilter}
              onOpenAdvancedFilters={() => setShowFilterModal(true)}
              hasActiveAdvancedFilters={Boolean(
                advancedFilters.categoryId ||
                advancedFilters.paymentMethod ||
                advancedFilters.accountId ||
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
                onSelectTransaction={setSelectedTransaction}
                isDarkMode={isDarkMode}
              />
            )}
          </ScrollView>

          {/* Botão Flutuante + Nova Transação */}
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => setShowNewModal(true)}
            activeOpacity={0.85}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.fabText}>Nova Transação</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'payable' ? (
        /* CONTEÚDO DA ABA A PAGAR */
        <PayableAccountsView
          onAccountPaid={() => loadData(false)}
          isDarkMode={isDarkMode}
        />
      ) : (
        /* CONTEÚDO DA ABA ASSISTENTE */
        <FinancialAiChatView
          categories={categories}
          onTransactionRegistered={() => loadData(false)}
          userName={userName}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Modais Auxiliares */}
      <TransactionFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        categories={categories}
        currentFilters={advancedFilters}
        onApplyFilters={setAdvancedFilters}
        isDarkMode={isDarkMode}
      />

      <NewTransactionModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        categories={categories}
        onSuccess={() => loadData(false)}
        userName={userName}
        isDarkMode={isDarkMode}
      />

      <TransactionDetailsModal
        visible={Boolean(selectedTransaction)}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onSuccess={() => loadData(false)}
        canReverse={isAdmin}
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
  topTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  topTabsBarDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    backgroundColor: '#f1f5f9',
  },
  activeTopTabBtn: {
    backgroundColor: '#ffffff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  topTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  topTabTextDark: {
    color: '#94a3b8',
  },
  activeTopTabText: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  activeTopTabTextAssistant: {
    color: '#7c3aed',
    fontWeight: '700',
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
