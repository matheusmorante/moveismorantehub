import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Clock3, UserRound } from 'lucide-react-native';
import { MobileDrill } from '../../../components/shared/MobileDrill';
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
      style={[
        styles.card,
        isOutside
          ? isDarkMode
            ? styles.cardOutsideDark
            : styles.cardOutside
          : isDarkMode
            ? styles.cardDepotDark
            : styles.cardDepot,
      ]}
    >
      <View style={styles.cardContent}>
        <View style={styles.mainContent}>
          <Text
            numberOfLines={2}
            style={[styles.productName, isDarkMode && styles.productNameDark]}
          >
            {productName}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.customerName, isDarkMode && styles.customerNameDark]}
          >
            {customer}
          </Text>
          <View style={styles.metadataRow}>
            <View
              style={[
                styles.typeBadge,
                isOutside ? styles.typeBadgeOutside : styles.typeBadgeDepot,
              ]}
              accessible
              accessibilityRole="text"
              accessibilityLabel={isOutside ? 'Montagem fora' : 'Montagem no depósito'}
            >
              <MobileDrill size={11} color="#ffffff" />
              <Text style={styles.typeBadgeText}>
                {isOutside ? 'MONTAGEM FORA' : 'MONTAGEM NO DEPÓSITO'}
              </Text>
            </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  cardDepot: { backgroundColor: '#fffbeb', borderBottomColor: '#fde68a' },
  cardDepotDark: { backgroundColor: '#3f2a1a', borderBottomColor: '#92400e' },
  cardOutside: { backgroundColor: '#fef2f2', borderBottomColor: '#fecaca' },
  cardOutsideDark: { backgroundColor: '#450a0a', borderBottomColor: '#991b1b' },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  mainContent: { flex: 1, minWidth: 0, gap: 3 },
  productName: { color: '#0f172a', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  productNameDark: { color: '#f8fafc' },
  customerName: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  customerNameDark: { color: '#cbd5e1' },
  metadataRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeDepot: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
    borderWidth: 1,
  },
  typeBadgeOutside: {
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
    borderWidth: 1,
  },
  typeBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
  metadataItem: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%' },
  metadataText: { color: '#475569', fontSize: 11, fontWeight: '600' },
  metadataTextDark: { color: '#cbd5e1' },
  responsibleText: { maxWidth: 120 },
});
