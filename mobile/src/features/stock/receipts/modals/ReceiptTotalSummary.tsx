import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type ReceiptTotalSummaryProps = {
  totalValue: number;
  isDarkMode: boolean;
};

export const ReceiptTotalSummary: React.FC<ReceiptTotalSummaryProps> = ({
  totalValue,
  isDarkMode,
}) => (
  <View
    style={[
      styles.totalBox,
      {
        borderColor: '#a7f3d0',
        backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
      },
    ]}
  >
    <Text
      style={{
        color: isDarkMode ? '#a7f3d0' : '#047857',
        fontWeight: '900',
      }}
    >
      Valor total do recebimento
    </Text>
    <Text
      style={{
        color: isDarkMode ? '#a7f3d0' : '#047857',
        fontWeight: '900',
        fontSize: 20,
      }}
    >
      {new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(totalValue)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  totalBox: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
