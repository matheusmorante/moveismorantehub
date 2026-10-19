import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { MobilePurchase } from '../../mobilePurchaseService';
import { styles } from './purchasesScreen.styles';
import { date, money, statusMeta } from './purchasesScreenUtils';

interface PurchaseCardProps {
  item: MobilePurchase;
  colors: { surface: string; border: string; text: string; muted: string };
  onPress: () => void;
}

export const PurchaseCard: React.FC<PurchaseCardProps> = ({ item, colors, onPress }) => {
  const status = statusMeta(item.status);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Pedido #{item.purchaseNumber || item.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]}>
            {date(item.date)} · {item.items.length} {item.items.length === 1 ? 'item' : 'itens'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text numberOfLines={2} style={[styles.supplier, { color: colors.text }]}>
        {item.supplierName}
      </Text>
      <View style={[styles.cardBottom, { borderColor: colors.border }]}>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {item.stockProcessed ? 'Estoque processado' : 'Aguardando recebimento'}
        </Text>
        <Text style={styles.cardTotal}>{money(item.totalValue)}</Text>
      </View>
    </TouchableOpacity>
  );
};
