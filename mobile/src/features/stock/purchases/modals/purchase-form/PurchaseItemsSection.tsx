import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Plus, Search, ChevronDown } from 'lucide-react-native';
import { CurrencyInput } from '../../../../../components/shared/CurrencyInput';
import type { MobilePurchaseItem } from '../../mobilePurchaseService';
import { formatMoney, parseNumber } from '../../hooks/usePurchaseForm';
import { calculateMobilePurchaseItemCostBreakdown } from '../../hooks/useMobilePurchaseItems';
import { PurchaseOrderItems } from './PurchaseOrderItems';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

export interface PurchaseItemsSectionProps {
  items: MobilePurchaseItem[];
  discountPercent?: string;
  ipiPercent?: string;
  freightPercent?: string;
  onOpenProductPicker: (index?: number) => void;
  onAddItemRow: () => void;
  onUpdateItem: (index: number, patch: Partial<MobilePurchaseItem>) => void;
  onRemoveItem: (index: number) => void;
  colors: ThemeColors;
  allowAdd?: boolean;
  showEmptyAddButton?: boolean;
  responsiveFieldRows?: boolean;
  allowRemove?: boolean;
  addDisabled?: boolean;
  isDarkMode?: boolean;
  receiptMode?: boolean;
  selectedItemIndex?: number | null;
  onSelectedItemChange?: (index: number | null) => void;
}

/**
 * Seção de itens do pedido de compra com edição inline: busca de produto, quantidade e custo diretamente no item.
 */
export const PurchaseItemsSection: React.FC<PurchaseItemsSectionProps> = (props) =>
  props.receiptMode ? <ReceiptItemsSection {...props} /> : <PurchaseOrderItems {...props} />;

const ReceiptItemsSection: React.FC<PurchaseItemsSectionProps> = ({
  items,
  discountPercent = '0',
  ipiPercent = '0',
  freightPercent = '0',
  onOpenProductPicker,
  onAddItemRow,
  onUpdateItem,
  onRemoveItem,
  colors,
  allowAdd = true,
  showEmptyAddButton = true,
  responsiveFieldRows = false,
  allowRemove = true,
  addDisabled = false,
  isDarkMode = false,
  receiptMode = false,
}) => {
  const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(() => {
    const firstUnselectedItem = items.findIndex((item) => !item.productId);
    if (firstUnselectedItem >= 0) return firstUnselectedItem;
    return items.length > 0 ? items.length - 1 : null;
  });
  const previousItemCount = useRef(items.length);

  useEffect(() => {
    if (items.length > previousItemCount.current) {
      setExpandedItemIndex(items.length - 1);
    } else if (items.length === 0) {
      setExpandedItemIndex(null);
    } else if (items.length < previousItemCount.current) {
      setExpandedItemIndex((current) =>
        current !== null && current >= items.length ? items.length - 1 : current
      );
    }
    previousItemCount.current = items.length;
  }, [items.length]);

  const handleAddItemRow = () => {
    setExpandedItemIndex(items.length);
    onAddItemRow();
  };

  const handleRemoveItem = (index: number) => {
    setExpandedItemIndex((current) => {
      if (current === null || current === index) return null;
      return current > index ? current - 1 : current;
    });
    onRemoveItem(index);
  };

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Itens ({items.length})
        </Text>
        {allowAdd && (
          <TouchableOpacity
            style={[styles.addButton, addDisabled && { opacity: 0.5 }]}
            onPress={handleAddItemRow}
            disabled={addDisabled}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.addButtonText}>Adicionar item</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Nenhum item adicionado ao pedido.
          </Text>
          {allowAdd && addDisabled ? (
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Selecione o fornecedor acima para liberar a inclusão de itens.
            </Text>
          ) : null}
          {allowAdd && showEmptyAddButton && (
            <TouchableOpacity
              style={[styles.emptyAddButton, addDisabled && { opacity: 0.5 }]}
              onPress={handleAddItemRow}
              disabled={addDisabled}
            >
              <Plus size={15} color="#2563eb" />
              <Text style={styles.emptyAddButtonText}>Adicionar primeiro item</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        items.map((item, index) => {
          const hasProduct = Boolean(item.productId);
          const summaryProduct = hasProduct && item.description?.trim()
            ? item.description
            : 'Produto não informado';
          const itemCosts = receiptMode ? null : calculateMobilePurchaseItemCostBreakdown(
            Number(item.baseCost || 0),
            Number(item.discountUnit || 0),
            discountPercent,
            ipiPercent,
            freightPercent
          );
          const itemTotal = itemCosts
            ? Number((Number(item.quantity || 0) * itemCosts.unitCost).toFixed(2))
            : Number(item.totalCost || 0);
          const summaryTotalCost = formatMoney(itemTotal);
          const isExpanded = expandedItemIndex === index;

          return (
            <View
              key={`${item.productId}-${item.variationId || index}`}
              style={[
                styles.item,
                {
                  borderColor: hasProduct ? colors.border : '#2563eb',
                  backgroundColor: colors.surface,
                },
              ]}
            >
              {/* Linha compacta expansível do item */}
              <View style={styles.itemHeader}>
                <TouchableOpacity
                  style={[styles.itemSummary, { justifyContent: isExpanded ? 'flex-end' : 'space-between' }]}
                  onPress={() => setExpandedItemIndex(isExpanded ? null : index)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={isExpanded
                    ? `Recolher item ${summaryProduct}`
                    : `Expandir ${summaryProduct}, quantidade ${item.quantity} un, custo total ${summaryTotalCost}`}
                  accessibilityState={{ expanded: isExpanded }}
                >
                  {!isExpanded && (
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                      {summaryProduct}
                    </Text>
                  )}
                  {!isExpanded && (
                    <Text style={[styles.itemSummaryMeta, { color: colors.muted }]} numberOfLines={1}>
                      {item.quantity} un
                    </Text>
                  )}
                  {!isExpanded && (
                    <Text style={[styles.itemSummaryTotal, { color: colors.text }]} numberOfLines={1}>
                      Total {summaryTotalCost}
                    </Text>
                  )}
                  {isExpanded && (
                    <Text style={[styles.collapseActionText, { color: colors.muted }]}>
                      Recolher item
                    </Text>
                  )}
                  <ChevronDown
                    size={16}
                    color={colors.muted}
                    style={isExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}
                  />
                </TouchableOpacity>

              </View>

              {isExpanded && (
                <>
                  {hasProduct ? (
                    <TouchableOpacity
                      style={[
                        styles.productSearchTrigger,
                        {
                          backgroundColor: colors.bg,
                          borderColor: isDarkMode ? '#4ade80' : '#16a34a',
                        },
                      ]}
                      onPress={() => onOpenProductPicker(index)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Alterar produto: ${item.description}`}
                    >
                      <Text
                        style={[
                          styles.productSearchTriggerText,
                          { color: isDarkMode ? '#4ade80' : '#15803d', flex: 1 },
                        ]}
                        numberOfLines={1}
                      >
                        {item.description}
                      </Text>
                      <Check size={16} color={isDarkMode ? '#4ade80' : '#15803d'} />
                    </TouchableOpacity>
                  ) : (
                  <TouchableOpacity
                    style={[
                      styles.productSearchTrigger,
                      {
                        backgroundColor: colors.bg,
                        borderColor: '#2563eb',
                      },
                    ]}
                    onPress={() => onOpenProductPicker(index)}
                    activeOpacity={0.7}
                  >
                    <Search size={16} color="#2563eb" />
                    <Text style={styles.productSearchTriggerText}>
                      Buscar produto...
                    </Text>
                  </TouchableOpacity>
                  )}

              {/* Quantidade e Custo Unitário diretamente no item */}
              <View style={[styles.row, responsiveFieldRows && styles.responsiveRow]}>
                <View style={[styles.half, responsiveFieldRows && styles.responsiveHalf]}>
                  <Text style={[styles.label, { color: colors.muted }]}>Quantidade</Text>
                  <TextInput
                    value={String(item.quantity ?? '')}
                    accessibilityLabel={`Quantidade de ${item.description || 'item'}`}
                    onChangeText={(value) =>
                      onUpdateItem(index, { quantity: parseNumber(value) })
                    }
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor={colors.muted}
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.bg,
                      },
                    ]}
                  />
                </View>

                <View style={[styles.half, responsiveFieldRows && styles.responsiveHalf]}>
                  <Text style={[styles.label, { color: colors.muted }]}>
                    {receiptMode ? 'Custo unitário' : 'Custo base por unidade'}
                  </Text>
                  <CurrencyInput
                    value={Number(item.baseCost) || null}
                    accessibilityLabel={`${receiptMode ? 'Custo unitário' : 'Custo base por unidade'} de ${item.description || 'item'}`}
                    onChangeValue={(value) =>
                      onUpdateItem(index, { baseCost: value || 0, unitCost: value || 0 })
                    }
                    placeholder="0,00"
                    style={[
                      styles.input,
                      { borderColor: colors.border, backgroundColor: colors.bg },
                    ]}
                    color={colors.text}
                  />
                </View>
              </View>

              <View style={styles.full}>
                <Text style={[styles.label, { color: colors.muted }]}>
                  {receiptMode ? 'Desconto por unidade' : 'Desconto unitário'}
                </Text>
                <CurrencyInput
                  value={Number(item.discountUnit || 0)}
                  onChangeValue={(value) =>
                    onUpdateItem(index, { discountUnit: Math.max(0, value || 0) })
                  }
                  placeholder="0,00"
                  accessibilityLabel={`${receiptMode ? 'Desconto por unidade' : 'Desconto unitário'} de ${item.description || 'item'}`}
                  style={[
                    styles.input,
                    { borderColor: colors.border, backgroundColor: colors.bg },
                  ]}
                  color={colors.text}
                />
              </View>

              {itemCosts ? (
                <>
                  <Text style={[styles.label, { color: colors.muted }]}>Composição e total</Text>
                  <View style={styles.metricsGrid}>
                    <View style={[styles.metricCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <Text style={[styles.metricLabel, { color: colors.muted }]}>IPI por unidade</Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>
                        {formatMoney(itemCosts.ipiValue)}
                      </Text>
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <Text style={[styles.metricLabel, { color: colors.muted }]}>Frete por unidade</Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>
                        {formatMoney(itemCosts.freightValue)}
                      </Text>
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <Text style={[styles.metricLabel, { color: colors.muted }]}>Custo unitário final</Text>
                      <Text style={[styles.metricValue, { color: '#059669' }]}>
                        {formatMoney(itemCosts.unitCost)}
                      </Text>
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', borderColor: isDarkMode ? '#047857' : '#a7f3d0' }]}>
                      <Text style={[styles.metricLabel, { color: isDarkMode ? '#a7f3d0' : '#047857' }]}>Total do item</Text>
                      <Text style={[styles.metricValue, { color: isDarkMode ? '#a7f3d0' : '#047857' }]}>
                        {formatMoney(itemTotal)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <Text style={styles.receiptItemTotal}>Subtotal: {formatMoney(itemTotal)}</Text>
              )}
                  {allowRemove && (
                    <TouchableOpacity
                      onPress={() => handleRemoveItem(index)}
                      style={styles.removeItemButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${item.description || 'item'}`}
                    >
                      <Text style={styles.removeItemText}>Remover item</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          );
        })
      )}

      {/* Botão para adicionar mais itens quando a lista já tem elementos */}
      {items.length > 0 && allowAdd && (
        <TouchableOpacity
          style={[
            styles.bottomAddButton,
            { borderColor: colors.border },
            addDisabled && { opacity: 0.5 },
          ]}
          onPress={onAddItemRow}
          disabled={addDisabled}
        >
          <Plus size={16} color="#2563eb" />
          <Text style={styles.bottomAddButtonText}>Adicionar outro item</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 3 },
  label: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 4 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  responsiveRow: { flexWrap: 'wrap' },
  half: { flex: 1 },
  responsiveHalf: { minWidth: 132 },
  full: { width: '100%' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { flex: 1, minWidth: 108, minHeight: 56, justifyContent: 'center', borderWidth: 1, borderRadius: 10, padding: 10 },
  metricLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
  metricValue: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  receiptItemTotal: { textAlign: 'right', color: '#059669', fontSize: 12, fontWeight: '900', marginTop: 2 },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 18, gap: 8 },
  emptyText: { textAlign: 'center', fontSize: 13, lineHeight: 18 },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  emptyAddButtonText: { color: '#2563eb', fontWeight: '900', fontSize: 13 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemSummary: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemSummaryMeta: { fontSize: 10, fontWeight: '700', flexShrink: 0 },
  itemSummaryTotal: { fontSize: 10, fontWeight: '900', flexShrink: 0 },
  collapseActionText: { fontSize: 11, fontWeight: '800' },
  changeProductButton: { minHeight: 34, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  itemName: { fontWeight: '900', fontSize: 13, flexShrink: 1 },
  removeItemButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 },
  removeItemText: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
  productSearchTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  productSearchTriggerText: {
    color: '#2563eb',
    fontWeight: '800',
    fontSize: 13,
  },
  bottomAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 2,
  },
  bottomAddButtonText: {
    color: '#2563eb',
    fontWeight: '900',
    fontSize: 13,
  },
});
