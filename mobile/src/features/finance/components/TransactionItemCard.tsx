import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, Bot, User } from 'lucide-react-native';
import { FinancialTransaction } from '../../../services/mobileFinanceService';

interface Props {
  transaction: FinancialTransaction;
  onPress: (transaction: FinancialTransaction) => void;
  isDarkMode?: boolean;
}

export const TransactionItemCard: React.FC<Props> = ({
  transaction,
  onPress,
  isDarkMode = false,
}) => {
  const isIncome = transaction.type === 'income';

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <TouchableOpacity
      style={[styles.card, isDarkMode && styles.cardDark]}
      onPress={() => onPress(transaction)}
      activeOpacity={0.7}
    >
      <View style={styles.leftCol}>
        <View style={[styles.iconBox, isIncome ? styles.incomeIconBg : styles.expenseIconBg]}>
          {isIncome ? (
            <ArrowUpRight size={18} color="#16a34a" />
          ) : (
            <ArrowDownLeft size={18} color="#dc2626" />
          )}
        </View>

        <View style={styles.textDetails}>
          <Text style={[styles.description, isDarkMode && styles.descriptionDark]} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={[styles.category, isDarkMode && styles.categoryDark]} numberOfLines={1}>
            {transaction.category_name || (isIncome ? 'Outras entradas' : 'Outras saídas')} • {transaction.payment_method}
          </Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text style={[styles.amount, isIncome ? styles.incomeText : styles.expenseText]}>
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </Text>
        <View style={styles.badgeRow}>
          {transaction.origin === 'AI_ASSISTANT' ? (
            <View style={styles.aiBadge}>
              <Bot size={10} color="#7c3aed" />
              <Text style={styles.aiBadgeText}>IA</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeIconBg: {
    backgroundColor: '#dcfce7',
  },
  expenseIconBg: {
    backgroundColor: '#fee2e2',
  },
  textDetails: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  descriptionDark: {
    color: '#f8fafc',
  },
  category: {
    fontSize: 12,
    color: '#64748b',
  },
  categoryDark: {
    color: '#94a3b8',
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
  incomeText: {
    color: '#16a34a',
  },
  expenseText: {
    color: '#dc2626',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
  },
});
