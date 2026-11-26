import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';

interface Props {
  activeTypeFilter: 'all' | 'income' | 'expense';
  onSelectTypeFilter: (type: 'all' | 'income' | 'expense') => void;
  onOpenAdvancedFilters: () => void;
  hasActiveAdvancedFilters?: boolean;
  isDarkMode?: boolean;
}

export const TransactionFilterBar: React.FC<Props> = ({
  activeTypeFilter,
  onSelectTypeFilter,
  onOpenAdvancedFilters,
  hasActiveAdvancedFilters = false,
  isDarkMode = false,
}) => {
  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.pillsRow}>
        <TouchableOpacity
          style={[
            styles.pill,
            activeTypeFilter === 'all' && styles.activePill,
            isDarkMode && activeTypeFilter !== 'all' && styles.pillDark,
          ]}
          onPress={() => onSelectTypeFilter('all')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              activeTypeFilter === 'all' && styles.activePillText,
              isDarkMode && activeTypeFilter !== 'all' && styles.pillTextDark,
            ]}
          >
            Todos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pill,
            activeTypeFilter === 'income' && styles.activePillIncome,
            isDarkMode && activeTypeFilter !== 'income' && styles.pillDark,
          ]}
          onPress={() => onSelectTypeFilter('income')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              activeTypeFilter === 'income' && styles.activePillTextIncome,
              isDarkMode && activeTypeFilter !== 'income' && styles.pillTextDark,
            ]}
          >
            Entradas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pill,
            activeTypeFilter === 'expense' && styles.activePillExpense,
            isDarkMode && activeTypeFilter !== 'expense' && styles.pillDark,
          ]}
          onPress={() => onSelectTypeFilter('expense')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.pillText,
              activeTypeFilter === 'expense' && styles.activePillTextExpense,
              isDarkMode && activeTypeFilter !== 'expense' && styles.pillTextDark,
            ]}
          >
            Saídas
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.filterBtn,
          hasActiveAdvancedFilters && styles.filterBtnActive,
          isDarkMode && styles.filterBtnDark,
        ]}
        onPress={onOpenAdvancedFilters}
        activeOpacity={0.7}
      >
        <SlidersHorizontal
          size={16}
          color={hasActiveAdvancedFilters ? '#3b82f6' : isDarkMode ? '#94a3b8' : '#64748b'}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  containerDark: {},
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  pillDark: {
    backgroundColor: '#1e293b',
  },
  activePill: {
    backgroundColor: '#0f172a',
  },
  activePillIncome: {
    backgroundColor: '#dcfce7',
  },
  activePillExpense: {
    backgroundColor: '#fee2e2',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  pillTextDark: {
    color: '#cbd5e1',
  },
  activePillText: {
    color: '#ffffff',
  },
  activePillTextIncome: {
    color: '#16a34a',
  },
  activePillTextExpense: {
    color: '#dc2626',
  },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnDark: {
    backgroundColor: '#1e293b',
  },
  filterBtnActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
});
