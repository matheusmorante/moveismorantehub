import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X, ShoppingBag } from 'lucide-react-native';
import { formatOrderCode, formatOrderDate } from '../../../utils/orderUtils';
import { getOrderDetailsStatusConfig } from './orderDetailsPresentation';
import { styles } from './orderDetailsModal.styles';

interface OrderDetailsModalHeaderProps {
  order: any;
  isDarkMode: boolean;
  onClose: () => void;
}

export const OrderDetailsModalHeader: React.FC<OrderDetailsModalHeaderProps> = ({
  order,
  isDarkMode,
  onClose,
}) => {
  const orderData = order.order_data || order;
  const orderCode = formatOrderCode(order);
  const orderDate = order.created_at || order.date || orderData.createdAt || orderData.date;
  const seller = order.seller || orderData.seller || orderData.sellerName || orderData.sellerData?.fullName;
  const rawStatus = order.status || orderData.status || 'scheduled';

  const { statusLabel, statusBg, statusBorder, statusColor } = getOrderDetailsStatusConfig(
    order,
    rawStatus,
    isDarkMode
  );

  return (
    <View style={[styles.headerRow, isDarkMode && styles.headerRowDark]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <View style={styles.iconCircle}>
          <ShoppingBag size={20} color="#2563eb" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.titleText, isDarkMode && styles.textDark]}>
              Detalhes do Pedido
            </Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>#{orderCode}</Text>
            </View>
          </View>

          <View style={styles.headerMetaRow}>
            {Boolean(orderDate) && (
              <Text style={[styles.metaText, isDarkMode && styles.metaTextDark]}>
                {formatOrderDate(orderDate)}
              </Text>
            )}
            {Boolean(seller) && (
              <Text style={[styles.metaText, isDarkMode && styles.metaTextDark]}>
                • Vendedor: <Text style={styles.sellerText}>{seller}</Text>
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {statusLabel.toUpperCase()}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Fechar detalhes do pedido"
        >
          <X size={18} color={isDarkMode ? '#f8fafc' : '#475569'} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
