import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Layers } from 'lucide-react-native';

interface Props {
  currentStock: number | null;
  isDarkMode: boolean;
}

export const StockBalanceBadge: React.FC<Props> = ({ currentStock, isDarkMode }) => {
  return (
    <View style={[styles.badge, isDarkMode && styles.badgeDark]}>
      <Layers size={14} color="#ffffff" />
      <Text style={styles.text}>
        Saldo em Estoque:{' '}
        <Text style={styles.value}>
          {currentStock !== null ? `${currentStock} un` : 'Calculando...'}
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeDark: {
    backgroundColor: '#047857',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  value: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
});
