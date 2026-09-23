import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { formatItemDisplayName } from '../../../utils/orderUtils';

interface AssemblyOrderCardProps {
  order: any;
  item: any;
  isOutside: boolean;
  isDarkMode: boolean;
  onPress: () => void;
}

export const AssemblyOrderCard: React.FC<AssemblyOrderCardProps> = ({ order, item, isOutside, isDarkMode, onPress }) => {
  const name = formatItemDisplayName(item);
  const quantity = Number(item?.quantity || item?.qty || 1);
  const productName = quantity > 1 ? `${quantity}x ${name}` : name;
  const customer = String(
    order?.order_data?.customerData?.fullName ||
    order?.order_data?.customerData?.name ||
    order?.order_data?.customer?.fullName ||
    order?.order_data?.customer?.name ||
    order?.order_data?.customerName ||
    order?.customer_name ||
    'Cliente',
  ).trim();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.card,
        isOutside ? styles.cardOutside : styles.cardInternal,
        isDarkMode && (isOutside ? styles.cardOutsideDark : styles.cardInternalDark),
      ]}
    >
      <View style={styles.cardContent}>
        <Text numberOfLines={2} style={[styles.primaryLine, isDarkMode && styles.primaryLineDark]}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={[styles.customerName, isDarkMode && styles.customerNameDark]}> — {customer}</Text>
        </Text>
        <ChevronRight size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 7,
    gap: 5,
  },
  cardInternal: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  cardOutside: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  cardInternalDark: { backgroundColor: '#78350f', borderColor: '#b45309' },
  cardOutsideDark: { backgroundColor: '#7f1d1d', borderColor: '#b91c1c' },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryLine: { color: '#0f172a', fontSize: 13, lineHeight: 18, flex: 1, minWidth: 0 },
  primaryLineDark: { color: '#f8fafc' },
  productName: { fontWeight: '800' },
  customerName: { color: '#64748b', fontWeight: '600' },
  customerNameDark: { color: '#cbd5e1' },
});
