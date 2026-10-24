import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Clock3, UserRound } from 'lucide-react-native';
import { formatItemDisplayName } from '../../../utils/orderUtils';

interface AssemblyOrderCardProps {
  order: any;
  item: any;
  isOutside: boolean;
  isDarkMode: boolean;
  onPress: () => void;
  scheduledTime?: string;
  responsibleName?: string;
}

export const AssemblyOrderCard: React.FC<AssemblyOrderCardProps> = ({
  order,
  item,
  isOutside,
  isDarkMode,
  onPress,
  scheduledTime,
  responsibleName,
}) => {
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
      'Cliente'
  ).trim();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.card, isDarkMode && styles.cardDark]}
    >
      <View style={styles.cardContent}>
        <View style={styles.mainContent}>
          <Text
            numberOfLines={2}
            style={[styles.primaryLine, isDarkMode && styles.primaryLineDark]}
          >
            <Text style={styles.productName}>{productName}</Text>
            <Text style={[styles.customerName, isDarkMode && styles.customerNameDark]}>
              {' '}
              — {customer}
            </Text>
          </Text>
          <View style={styles.metadataRow}>
            <Text style={[styles.typeBadge, isDarkMode && styles.typeBadgeDark]}>
              {isOutside ? 'MONTAGEM FORA' : 'NO DEPÓSITO'}
            </Text>
            {scheduledTime ? (
              <View style={styles.metadataItem}>
                <Clock3 size={12} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
                <Text style={[styles.metadataText, isDarkMode && styles.metadataTextDark]}>
                  {scheduledTime}
                </Text>
              </View>
            ) : null}
            {responsibleName ? (
              <View style={styles.metadataItem}>
                <UserRound size={12} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.metadataText,
                    styles.responsibleText,
                    isDarkMode && styles.metadataTextDark,
                  ]}
                >
                  {responsibleName}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <ChevronRight size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mainContent: { flex: 1, minWidth: 0, gap: 6 },
  primaryLine: { color: '#0f172a', fontSize: 13, lineHeight: 18 },
  primaryLineDark: { color: '#f8fafc' },
  productName: { fontWeight: '800' },
  customerName: { color: '#64748b', fontWeight: '600' },
  customerNameDark: { color: '#cbd5e1' },
  metadataRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  typeBadge: {
    color: '#475569',
    backgroundColor: '#f1f5f9',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  typeBadgeDark: { color: '#e2e8f0', backgroundColor: '#334155' },
  metadataItem: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%' },
  metadataText: { color: '#64748b', fontSize: 10, fontWeight: '600' },
  metadataTextDark: { color: '#cbd5e1' },
  responsibleText: { maxWidth: 120 },
});
