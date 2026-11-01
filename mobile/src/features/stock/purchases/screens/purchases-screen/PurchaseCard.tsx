import React from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { formatPurchaseNumber } from '../../../../../../../shared-utils/purchaseNumber';
import type { MobilePurchase } from '../../mobilePurchaseService';
import { styles } from './purchasesScreen.styles';
import { date, money, statusMeta } from './purchasesScreenUtils';

interface PurchaseCardProps {
  item: MobilePurchase;
  colors: { surface: string; border: string; text: string; muted: string };
  onPress: () => void;
  onOpenMenu: () => void;
  onOpenStatusMenu: () => void;
}

export const PurchaseCard: React.FC<PurchaseCardProps> = ({
  item,
  colors,
  onPress,
  onOpenMenu,
  onOpenStatusMenu,
}) => {
  const status = statusMeta(item.status);
  const purchaseCode = formatPurchaseNumber(item.purchaseNumber) || item.id.slice(0, 8).toUpperCase();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Pedido #{purchaseCode}
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]}>
            {date(item.date)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {item.status === 'draft' ? (
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Status: ${status.label}`}
              style={[styles.badge, { backgroundColor: status.bg }]}
            >
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Alterar status do pedido #${purchaseCode}`}
              onPress={(event) => {
                event.stopPropagation();
                onOpenStatusMenu();
              }}
              hitSlop={4}
              style={[styles.badge, styles.badgeButton, { backgroundColor: status.bg }]}
            >
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
              <ChevronDown size={12} color={status.color} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Opções do pedido de compra #${purchaseCode}`}
            onPress={(event) => {
              event.stopPropagation();
              onOpenMenu();
            }}
            hitSlop={8}
            style={{ padding: 6 }}
          >
            <MoreVertical size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </View>
      <Text numberOfLines={2} style={[styles.supplier, { color: colors.text }]}>
        {item.supplierName}
      </Text>
      <View style={[styles.cardBottom, { borderColor: colors.border }]}>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {item.items.length} {item.items.length === 1 ? 'item' : 'itens'}
        </Text>
        <Text style={styles.cardTotal}>{money(item.totalValue)}</Text>
      </View>
    </TouchableOpacity>
  );
};
