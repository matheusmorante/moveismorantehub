import { useState, useEffect, useCallback } from 'react';
import {
  FinancialCategory,
  FinancialTransaction,
  MonthlySummary,
  TransactionFilterOptions,
  fetchFinancialCategories,
  fetchMonthlySummary,
  fetchTransactionsForMonth,
} from '../../../services/mobileFinanceService';

interface UseFinanceHubDataProps {
  userProfile?: any;
}

export function useFinanceHubData({ userProfile }: UseFinanceHubDataProps) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

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
  const [actionsTransaction, setActionsTransaction] = useState<FinancialTransaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);

  const userName = userProfile?.full_name || userProfile?.name || 'Operador';
  const profileRoles = [
    ...(Array.isArray(userProfile?.roles) ? userProfile.roles : []),
    userProfile?.role,
  ]
    .filter(Boolean)
    .map(role => String(role).trim().toLowerCase());
  const isAdmin = profileRoles.some(role => ['admin', 'administrator', 'master'].includes(role));

  const loadData = useCallback(async (showLoading = true) => {
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
  }, [selectedYear, selectedMonth, typeFilter, advancedFilters]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  return {
    selectedYear,
    selectedMonth,
    categories,
    summary,
    transactions,
    loadingData,
    refreshing,
    typeFilter,
    advancedFilters,
    showFilterModal,
    showNewModal,
    selectedTransaction,
    actionsTransaction,
    editingTransaction,
    userName,
    isAdmin,
    setTypeFilter,
    setAdvancedFilters,
    setShowFilterModal,
    setShowNewModal,
    setSelectedTransaction,
    setActionsTransaction,
    setEditingTransaction,
    handleMonthChange,
    handleRefresh,
    loadData,
  };
}
