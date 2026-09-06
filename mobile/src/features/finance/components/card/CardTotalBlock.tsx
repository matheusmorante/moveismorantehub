import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  formattedTotal: string;
  isIncome: boolean;
  isDarkMode?: boolean;
}

export const CardTotalBlock: React.FC<Props> = ({
  formattedTotal,
  isIncome,
  isDarkMode = false,
}) => {
  return (
    <View style={styles.totalBlock}>
      <Text style={styles.totalLabel}>TOTAL</Text>
      <Text style={[styles.totalAmountText, { color: isIncome ? '#16a34a' : '#0f172a' }, isDarkMode && styles.textDark]}>
        {formattedTotal}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  totalBlock: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  totalAmountText: {
    fontSize: 22,
    fontWeight: '800',
  },
  textDark: {
    color: '#f8fafc',
  },
});
