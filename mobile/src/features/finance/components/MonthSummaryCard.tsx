import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react-native';

interface Props {
  income: number;
  expense: number;
  balance: number;
  isDarkMode?: boolean;
}

export const MonthSummaryCard: React.FC<Props> = ({
  income,
  expense,
  balance,
  isDarkMode = false,
}) => {
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isBalancePositive = balance >= 0;

  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      <View style={styles.grid}>
        {/* Entradas */}
        <View style={[styles.col, styles.borderRight, isDarkMode && styles.borderRightDark]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconBg, { backgroundColor: '#dcfce7' }]}>
              <TrendingUp size={14} color="#16a34a" />
            </View>
            <Text style={[styles.label, isDarkMode && styles.labelDark]}>Entradas</Text>
          </View>
          <Text style={styles.incomeValue}>
            + {formatCurrency(income)}
          </Text>
        </View>

        {/* Saídas */}
        <View style={styles.col}>
          <View style={styles.headerRow}>
            <View style={[styles.iconBg, { backgroundColor: '#fee2e2' }]}>
              <TrendingDown size={14} color="#dc2626" />
            </View>
            <Text style={[styles.label, isDarkMode && styles.labelDark]}>Saídas</Text>
          </View>
          <Text style={styles.expenseValue}>
            - {formatCurrency(expense)}
          </Text>
        </View>
      </View>

      {/* Saldo Financeiro do Período */}
      <View style={[styles.balanceRow, isDarkMode && styles.balanceRowDark]}>
        <View style={styles.headerRow}>
          <Wallet size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text style={[styles.balanceLabel, isDarkMode && styles.balanceLabelDark]}>
            Saldo Financeiro Único
          </Text>
        </View>
        <Text
          style={[
            styles.balanceValue,
            isBalancePositive ? styles.positiveText : styles.negativeText,
          ]}
        >
          {isBalancePositive ? '+' : ''} {formatCurrency(balance)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  grid: {
    flexDirection: 'row',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  col: {
    flex: 1,
    paddingHorizontal: 4,
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  borderRightDark: {
    borderRightColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  iconBg: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  labelDark: {
    color: '#94a3b8',
  },
  incomeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 2,
  },
  expenseValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  balanceRowDark: {},
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  balanceLabelDark: {
    color: '#cbd5e1',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  positiveText: {
    color: '#059669',
  },
  negativeText: {
    color: '#e11d48',
  },
});
