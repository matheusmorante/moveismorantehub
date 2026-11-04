import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ChevronDown, ChevronUp, DollarSign, FileText, PackageCheck } from 'lucide-react-native';
import { SectionCard, SectionHeader } from './SectionCard';
import { formatItemDisplayName } from '../../../utils/productNameFormatters';
import {
  resolveOrderItemHandling,
  resolveOrderItemTypeLabel,
  summarizeOrderItemHandling,
} from '../../../../../shared-utils/orderItemPresentation';

interface ItemsSectionProps {
  items: any[];
  total?: number;
  itemsSummary?: any;
  shippingValue?: number;
  dark?: boolean;
}

export function ItemsSection({
  items,
  total,
  itemsSummary,
  shippingValue = 0,
  dark,
}: ItemsSectionProps) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 640;
  const [expandedHandlingItems, setExpandedHandlingItems] = React.useState<Set<number>>(
    () => new Set()
  );
  const calculatedItemsSubtotal = (items || []).reduce((acc: number, item: any) => {
    const qty = Number(item.quantity || item.qty || 1);
    const unitPrice = Number(item.unitPrice || item.price || item.total || 0);
    return acc + unitPrice * qty;
  }, 0);

  const totalDiscount = Number(itemsSummary?.totalFixedDiscount || 0);
  const subtotal = Number(itemsSummary?.itemsSubtotal) || calculatedItemsSubtotal;
  const shipping = Number(shippingValue || 0);

  return (
    <>
      <SectionCard dark={dark}>
        <SectionHeader
          dark={dark}
          icon={<FileText size={18} color="#7c3aed" />}
          title={`ITENS DO PEDIDO (${items?.length || 0})`}
        />
        <View style={styles.itemsListContainer}>
          {(items || []).map((item: any, index: number) => {
            const handlingType = resolveOrderItemHandling(item);
            const handlingSummary = summarizeOrderItemHandling(handlingType);
            const itemTypeLabel = resolveOrderItemTypeLabel(item);
            const canExpandHandling = handlingType !== handlingSummary;
            const isHandlingExpanded = expandedHandlingItems.has(index);
            const qty = Number(item.quantity || item.qty || 1);
            const unitPrice = Number(item.unitPrice || 0);
            const unitDiscount = Number(item.unitDiscount || 0);
            const discountType = item.discountType || 'fixed';

            let discountValue = 0;
            if (unitDiscount > 0 && unitPrice > 0) {
              discountValue =
                discountType === 'fixed' ? unitDiscount : (unitPrice * unitDiscount) / 100;
            }

            const finalTotalPrice = Number(item.total || item.price || item.unitPrice || 0);
            const finalUnitPrice = finalTotalPrice / qty;
            const hasDiscount =
              discountValue > 0 || (unitPrice > 0 && unitPrice > finalUnitPrice + 0.01);

            const displayFinalPrice = finalTotalPrice;
            const displayOriginalPrice = hasDiscount ? unitPrice * qty : finalTotalPrice;

            return (
              <View
                key={index}
                style={[
                  styles.itemCard,
                  isNarrow && styles.itemCardNarrow,
                  dark && styles.itemCardDark,
                ]}
              >
                <View style={styles.itemInfo}>
                  <View style={styles.primaryRow}>
                    <Text style={[styles.quantity, dark && styles.light]}>{qty}×</Text>
                    <Text style={[styles.productName, dark && styles.light]}>
                      {formatItemDisplayName(item)}
                    </Text>
                  </View>
                  {(itemTypeLabel || handlingType) && (
                    <View style={styles.itemLabels}>
                      {itemTypeLabel ? (
                        <View style={[styles.typeBadge, dark && styles.typeBadgeDark]}>
                          <Text style={[styles.typeBadgeText, dark && styles.typeBadgeTextDark]}>
                            {itemTypeLabel}
                          </Text>
                        </View>
                      ) : null}
                      {handlingType ? (
                        canExpandHandling ? (
                          <View style={styles.handlingGroup}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityState={{ expanded: isHandlingExpanded }}
                              accessibilityLabel={
                                isHandlingExpanded
                                  ? 'Ocultar instrução completa de manuseio'
                                  : `Ver instrução completa de manuseio: ${handlingType}`
                              }
                              onPress={() =>
                                setExpandedHandlingItems((current) => {
                                  const next = new Set(current);
                                  if (next.has(index)) next.delete(index);
                                  else next.add(index);
                                  return next;
                                })
                              }
                              style={styles.handlingInline}
                            >
                              <PackageCheck size={13} color={dark ? '#60a5fa' : '#3b82f6'} />
                              <Text style={[styles.handlingText, dark && styles.handlingTextDark]}>
                                {handlingSummary}
                              </Text>
                              {isHandlingExpanded ? (
                                <ChevronUp size={13} color={dark ? '#94a3b8' : '#64748b'} />
                              ) : (
                                <ChevronDown size={13} color={dark ? '#94a3b8' : '#64748b'} />
                              )}
                            </Pressable>
                            {isHandlingExpanded && (
                              <Text style={[styles.handlingDetails, dark && styles.handlingTextDark]}>
                                {handlingType}
                              </Text>
                            )}
                          </View>
                        ) : (
                          <View style={styles.handlingInline}>
                            <PackageCheck size={13} color={dark ? '#60a5fa' : '#3b82f6'} />
                            <Text style={[styles.handlingText, dark && styles.handlingTextDark]}>
                              {handlingSummary}
                            </Text>
                          </View>
                        )
                      ) : null}
                    </View>
                  )}
                </View>

                <View style={[styles.priceContainer, isNarrow && styles.priceContainerNarrow]}>
                  {hasDiscount && displayOriginalPrice > displayFinalPrice && (
                    <Text style={[styles.originalPrice, dark && styles.originalPriceDark]}>
                      R${' '}
                      {displayOriginalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

      {/* Resumo Financeiro Completo (idêntico ao ERP) */}
      <View style={[styles.financialCard, dark && styles.financialCardDark]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, dark && styles.summaryLabelDark]}>SUBTOTAL ITENS</Text>
          <Text style={[styles.summaryValue, dark && styles.light]}>
            R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        {totalDiscount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.discountLabel}>DESCONTO</Text>
            <Text style={styles.discountValue}>
              - R$ {totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        {shipping > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, dark && styles.summaryLabelDark]}>FRETE / ENTREGA</Text>
            <Text style={[styles.summaryValue, dark && styles.light]}>
              R$ {shipping.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}

        <View style={[styles.divider, dark && styles.dividerDark]} />

        <View style={styles.totalRow}>
          <View style={styles.inline}>
            <DollarSign size={20} color="#2563eb" />
            <Text style={[styles.totalTitle, dark && styles.light]}>TOTAL DO PEDIDO</Text>
          </View>
          <Text style={styles.total}>
            R${' '}
            {Number(total || 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
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
  itemCardNarrow: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  itemCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  itemInfo: { flex: 1, minWidth: 0, gap: 5 },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    minWidth: 0,
  },
  quantity: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '900',
    color: '#334155',
  },
  productName: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemLabels: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeBadgeDark: { backgroundColor: '#1e293b' },
  typeBadgeText: { fontSize: 9, fontWeight: '600', color: '#475569' },
  typeBadgeTextDark: { color: '#cbd5e1' },
  handlingGroup: { flexShrink: 1, minWidth: 0, gap: 2 },
  handlingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    gap: 4,
  },
  handlingText: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 10,
    lineHeight: 14,
    color: '#64748b',
  },
  handlingTextDark: { color: '#94a3b8' },
  handlingDetails: {
    marginLeft: 17,
    flexShrink: 1,
    fontSize: 9,
    lineHeight: 13,
    color: '#64748b',
  },
  priceContainer: { alignItems: 'flex-end', justifyContent: 'center', gap: 1 },
  priceContainerNarrow: { alignItems: 'flex-start' },
  price: { fontSize: 13, fontWeight: '900', color: '#16a34a' },
  financialCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  financialCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  summaryLabelDark: {
    color: '#94a3b8',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  discountLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#16a34a',
    letterSpacing: 0.5,
  },
  discountValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#16a34a',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  dividerDark: {
    backgroundColor: '#334155',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 },
  totalTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  total: { fontSize: 18, fontWeight: '900', color: '#2563eb' },
  originalPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  originalPriceDark: { color: '#64748b' },
});
