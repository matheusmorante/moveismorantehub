import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { FinancialTransaction } from '../../../services/mobileFinanceService';
import { TransactionItemCard } from './TransactionItemCard';

interface Props {
  transactions: FinancialTransaction[];
  onSelectTransaction: (transaction: FinancialTransaction) => void;
  isDarkMode?: boolean;
}

interface GroupedByDate {
  dateKey: string;
  formattedLabel: string;
  items: FinancialTransaction[];
}

export const TransactionListGrouped: React.FC<Props> = ({
  transactions,
  onSelectTransaction,
  isDarkMode = false,
}) => {
  const formatGroupHeader = (dateStr: string) => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const [y, m, d] = dateStr.split('-').map(Number);
      const monthNamesShort = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const monthLabel = monthNamesShort[(m || 1) - 1];

      if (dateStr === todayStr) {
        return `HOJE · ${d} ${monthLabel}`;
      }
      if (dateStr === yesterdayStr) {
        return `ONTEM · ${d} ${monthLabel}`;
      }
      return `${d} ${monthLabel}`;
    } catch {
      return dateStr;
    }
  };

  // Group items by date
  const groupedMap: Record<string, FinancialTransaction[]> = {};
  transactions.forEach(item => {
    const key = item.date || 'Desconhecida';
    if (!groupedMap[key]) groupedMap[key] = [];
    groupedMap[key].push(item);
  });

  const sortedDates = Object.keys(groupedMap).sort((a, b) => b.localeCompare(a));

  const groups: GroupedByDate[] = sortedDates.map(dateKey => ({
    dateKey,
    formattedLabel: formatGroupHeader(dateKey),
    items: groupedMap[dateKey],
  }));

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
          Nenhuma movimentação financeira encontrada neste período.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {groups.map(group => (
        <View key={group.dateKey} style={styles.groupContainer}>
          <Text style={[styles.dateHeader, isDarkMode && styles.dateHeaderDark]}>
            {group.formattedLabel}
          </Text>
          {group.items.map(item => (
            <TransactionItemCard
              key={item.id}
              transaction={item}
              onPress={onSelectTransaction}
              isDarkMode={isDarkMode}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  groupContainer: {
    marginTop: 8,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    paddingHorizontal: 16,
    paddingVertical: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dateHeaderDark: {
    color: '#94a3b8',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyTextDark: {
    color: '#94a3b8',
  },
});
