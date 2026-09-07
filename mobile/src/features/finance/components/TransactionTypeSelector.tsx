import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  type: 'income' | 'expense' | null;
  onTypeChange: (type: 'income' | 'expense') => void;
  hasError?: boolean;
  isDarkMode?: boolean;
}

export const TransactionTypeSelector: React.FC<Props> = ({
  type,
  onTypeChange,
  hasError,
  isDarkMode,
}) => {
  return (
    <View>
      <Text style={[styles.label, isDarkMode && styles.labelDark]}>
        Tipo de Movimentação <Text style={styles.requiredAsterisk}>*</Text>
      </Text>
      <View style={[styles.typeRow, hasError && styles.rowError]}>
        <TouchableOpacity
          style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
          onPress={() => onTypeChange('income')}
          activeOpacity={0.7}
        >
          <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextIncome]}>
            + Entrada
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
          onPress={() => onTypeChange('expense')}
          activeOpacity={0.7}
        >
          <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextExpense]}>
            - Saída
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
  },
  labelDark: {
    color: '#cbd5e1',
  },
  requiredAsterisk: {
    color: '#dc2626',
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  rowError: {
    borderWidth: 1.5,
    borderColor: '#dc2626',
    borderRadius: 12,
    padding: 3,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  typeBtnIncome: {
    backgroundColor: '#dcfce7',
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  typeBtnExpense: {
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  typeBtnTextIncome: {
    color: '#16a34a',
  },
  typeBtnTextExpense: {
    color: '#dc2626',
  },
});
