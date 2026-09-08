import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DollarSign, FileText, Flame } from 'lucide-react-native';
import { SectionCard, SectionHeader } from './SectionCard';
import { formatItemNameExact } from '../../../utils/orderUtils';

interface ItemsSectionProps {
  items: any[];
  handlingOptions?: any[];
  total?: number;
  pendingTotal?: number;
  dark?: boolean;
}

function resolveOpportunityLabel(item: any): string | null {
  const rawOpp = item.opportunityName || item.opportunity?.name || item.opportunity;
  if (typeof rawOpp === 'string' && rawOpp.trim()) {
    const trimmed = rawOpp.trim();
    return /^salvado$/i.test(trimmed) ? 'Queima dos Salvados' : trimmed;
  }
  if (item.condition === 'salvado' || item.is_salvado) {
    return 'Queima dos Salvados';
  }
  return null;
}

export function ItemsSection({ items, handlingOptions, total, dark }: ItemsSectionProps) {
  return (
    <>
      <SectionCard dark={dark}>
        <SectionHeader dark={dark} icon={<FileText size={18} color="#7c3aed" />} title={`ITENS DO PEDIDO (${items?.length || 0})`} />
        <View style={styles.itemsListContainer}>
          {(items || []).map((item: any, index: number) => {
            const qty = Number(item.quantity || item.qty || 1);
            const unitPrice = Number(item.unitPrice || 0);
            const unitDiscount = Number(item.unitDiscount || 0);
            const discountType = item.discountType || 'fixed';

            let discountValue = 0;
            if (unitDiscount > 0 && unitPrice > 0) {
              discountValue = discountType === 'fixed' ? unitDiscount : (unitPrice * unitDiscount) / 100;
            }

            const finalTotalPrice = Number(item.total || item.price || item.unitPrice || 0);
            const finalUnitPrice = finalTotalPrice / qty;
            const hasDiscount = discountValue > 0 || (unitPrice > 0 && unitPrice > finalUnitPrice + 0.01);

            const handlingText = String(item.handlingType || item.handling || item.manuseio || item.handling_type || '').trim();
            const displayFinalPrice = finalTotalPrice;
            const displayOriginalPrice = hasDiscount ? (unitPrice * qty) : finalTotalPrice;

            const opt = (handlingOptions || []).find((o: any) => 
              String(o.label || '').trim().toLowerCase() === handlingText.toLowerCase()
            );
            const handlingColor = opt?.color || (dark ? '#94a3b8' : '#64748b');
            const handlingBg = opt?.color ? `${opt.color}18` : (dark ? '#0f172a' : '#f1f5f9');
            const handlingBorder = opt?.color ? `${opt.color}45` : (dark ? '#334155' : '#e2e8f0');

            const opportunityLabel = resolveOpportunityLabel(item);

            return (
              <View key={index} style={[styles.itemCard, dark && styles.itemCardDark]}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, dark && styles.light]}>
                    <Text style={styles.qty}>{qty}x</Text> {formatItemNameExact(item)}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
                    {Boolean(opportunityLabel) && (
                      <View style={[styles.oppBadge, dark && styles.oppBadgeDark]}>
                        <Flame size={10} color={dark ? '#fbbf24' : '#d97706'} />
                        <Text style={[styles.oppBadgeText, dark && styles.oppBadgeTextDark]}>
                          {opportunityLabel}
                        </Text>
                      </View>
                    )}
                    {Boolean(handlingText) && (
                      <View style={[styles.handlingBadge, { backgroundColor: handlingBg, borderColor: handlingBorder }]}>
                        <Text style={[styles.itemHandling, { color: handlingColor }]}>
                          {handlingText}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>

                <View style={styles.priceContainer}>
                  {hasDiscount && displayOriginalPrice > displayFinalPrice && (
                    <Text style={[styles.originalPrice, dark && styles.originalPriceDark]}>
                      R$ {displayOriginalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                  {displayFinalPrice > 0 && (
                    <Text style={styles.price}>
                      R$ {displayFinalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </SectionCard>

      <View style={[styles.totalCard, dark && styles.totalDark]}>
        <View style={styles.totalRow}>
          <View style={styles.inline}>
            <DollarSign size={21} color="#16a34a" />
            <Text style={[styles.totalTitle, dark && styles.light]}>VALOR TOTAL</Text>
          </View>
          <Text style={styles.total}>
            R$ {Number(total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  light: { color: '#f8fafc' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  itemsListContainer: { gap: 8, marginTop: 4 },
  tagsRow: { gap: 6, alignItems: 'center', paddingRight: 4 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#1e293b', lineHeight: 18 },
  handlingBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  itemHandling: { fontSize: 10, fontWeight: '800' },
  oppBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  oppBadgeDark: {
    backgroundColor: '#451a03',
    borderColor: '#b45309',
  },
  oppBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#92400e',
  },
  oppBadgeTextDark: {
    color: '#fcd34d',
  },
  qty: { color: '#7c3aed', fontWeight: '900' },
  priceContainer: { alignItems: 'flex-end', justifyContent: 'center', gap: 1 },
  price: { fontSize: 13, fontWeight: '900', color: '#16a34a' },
  totalCard: { backgroundColor: '#f0fdf4', padding: 17, borderRadius: 20, borderWidth: 1, borderColor: '#bbf7d0', gap: 10 },
  totalDark: { backgroundColor: '#064e3b', borderColor: '#047857' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalTitle: { fontSize: 12, fontWeight: '900', color: '#065f46' },
  total: { fontSize: 17, fontWeight: '900', color: '#16a34a' },
  originalPrice: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textDecorationLine: 'line-through' },
  originalPriceDark: { color: '#64748b' },
});
