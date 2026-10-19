import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DollarSign, FileText } from 'lucide-react-native';
import { SectionCard, SectionHeader } from './SectionCard';
import { OrderItemChip } from '../../orders/OrderItemChip';
import { StockOriginBadge } from '../../../features/products/components/StockOriginBadge';
import { isAssemblyInternalType, isAssemblyOutsideType } from '../../../utils/aiSummaryHelper';

interface ItemsSectionProps {
  items: any[];
  handlingOptions?: any[];
  total?: number;
  itemsSummary?: any;
  shippingValue?: number;
  dark?: boolean;
}

export function ItemsSection({
  items,
  handlingOptions,
  total,
  itemsSummary,
  shippingValue = 0,
  dark,
}: ItemsSectionProps) {
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
            const handlingType = String(
              item.handlingType || item.handling || item.manuseio || item.handling_type || ''
            ).trim();
            const rawStockOrigin = String(
              item.stockOrigin ||
                item.stock_origin ||
                item.productKind ||
                item.product_kind ||
                item.condition ||
                (item.is_salvado ? 'salvado' : 'normal')
            ).toLocaleLowerCase('pt-BR');
            const stockOriginKind = rawStockOrigin.includes('salvad')
              ? 'salvado'
              : rawStockOrigin.includes('usad')
                ? 'usado'
                : 'normal';
            const isOutside = isAssemblyOutsideType(handlingType, handlingOptions);
            const isInternal = isAssemblyInternalType(handlingType, handlingOptions);
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
              <View key={index} style={[styles.itemCard, dark && styles.itemCardDark]}>
                <View style={styles.itemInfo}>
                  <OrderItemChip item={item} handlingOptions={handlingOptions} dark={dark} />
                  {(handlingType || item.itemType !== 'service') && (
                    <View style={styles.itemLabels}>
                      {item.itemType !== 'service' && (
                        <StockOriginBadge
                          product={{ productKind: stockOriginKind }}
                          dark={dark}
                          size="xs"
                        />
                      )}
                      {handlingType ? (
                        <View
                          style={[
                            styles.handlingBadge,
                            isOutside
                              ? styles.handlingOutside
                              : isInternal
                                ? styles.handlingInternal
                                : styles.handlingDefault,
                            dark && styles.handlingBadgeDark,
                          ]}
                        >
                          <Text
                            style={[
                              styles.handlingText,
                              isOutside
                                ? styles.handlingOutsideText
                                : isInternal
                                  ? styles.handlingInternalText
                                  : styles.handlingDefaultText,
                              dark && styles.handlingTextDark,
                            ]}
                          >
                            {handlingType}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>

                <View style={styles.priceContainer}>
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
  itemCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  itemInfo: { flex: 1, gap: 4 },
  itemLabels: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  handlingBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  handlingBadgeDark: { backgroundColor: '#1e293b', borderColor: '#475569' },
  handlingOutside: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  handlingInternal: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  handlingDefault: { backgroundColor: '#dbeafe', borderColor: '#bfdbfe' },
  handlingText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  handlingTextDark: { color: '#cbd5e1' },
  handlingOutsideText: { color: '#b91c1c' },
  handlingInternalText: { color: '#b45309' },
  handlingDefaultText: { color: '#1e3a8a' },
  priceContainer: { alignItems: 'flex-end', justifyContent: 'center', gap: 1 },
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
