import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Search, ChevronDown } from 'lucide-react-native';
import { CurrencyInput } from '../../../../../components/shared/CurrencyInput';
import type { MobilePurchaseItem } from '../../mobilePurchaseService';
import { formatMoney, parseNumber } from '../../hooks/usePurchaseForm';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

interface PurchaseItemsSectionProps {
  items: MobilePurchaseItem[];
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
}

/**
 * Seção de itens do pedido de compra com edição inline: busca de produto, quantidade e custo diretamente no item.
 */
export const PurchaseItemsSection: React.FC<PurchaseItemsSectionProps> = ({
  items,
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
          const summaryTotalCost = formatMoney(Number(item.totalCost || 0));
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
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                      onPress={() => onOpenProductPicker(index)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Alterar produto: ${item.description}`}
                    >
                      <Text
                        style={[styles.productSearchTriggerText, { color: colors.text, flex: 1 }]}
                        numberOfLines={1}
                      >
                        {item.description}
                      </Text>
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
                  <Text style={[styles.label, { color: colors.muted }]}>Custo unitário</Text>
                  <CurrencyInput
                    value={Number(item.baseCost) || null}
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
                <Text style={[styles.label, { color: colors.muted }]}>Desconto por unidade</Text>
                <CurrencyInput
                  value={Number(item.discountUnit || 0)}
                  onChangeValue={(value) =>
                    onUpdateItem(index, { discountUnit: Math.max(0, value || 0) })
                  }
                  placeholder="0,00"
                  accessibilityLabel={`Desconto por unidade de ${item.description || 'item'}`}
                  style={[
                    styles.input,
                    { borderColor: colors.border, backgroundColor: colors.bg },
                  ]}
                  color={colors.text}
                />
              </View>

              <Text style={[styles.itemTotal, { color: '#059669' }]}>
                Subtotal:{' '}
                {formatMoney(
                  Number(item.totalCost || 0)
                )}
              </Text>
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
  itemTotal: { textAlign: 'right', fontSize: 12, fontWeight: '900', marginTop: 2 },
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
