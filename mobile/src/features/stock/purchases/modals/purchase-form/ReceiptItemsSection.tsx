import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Check, Plus, Search, ChevronDown } from 'lucide-react-native';
import { FormTextInput } from '../../../../../components/shared/FormTextInput';
import { CurrencyInput } from '../../../../../components/shared/CurrencyInput';
import type { MobilePurchaseItem } from '../../mobilePurchaseService';
import { formatMoney, parseNumber } from '../../hooks/usePurchaseForm';
import { calculateMobilePurchaseItemCostBreakdown } from '../../hooks/useMobilePurchaseItems';
import {
  AnimatedPurchaseItemDetails,
  usePurchaseItemReduceMotion,
} from './PurchaseOrderItems';
import type { PurchaseItemsSectionProps } from './purchaseItemsSection.types';
import { receiptItemsSectionStyles as styles } from './receiptItemsSection.styles';

export const ReceiptItemsSection: React.FC<PurchaseItemsSectionProps> = ({
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
  simplifiedReceiptMode = false,
  showReceiptCostComposition = false,
  readOnly = false,
  selectedItemIndex = null,
}) => {
  const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(selectedItemIndex);
  const reduceMotion = usePurchaseItemReduceMotion();
  const previousItemCount = useRef(items.length);
  const canAdd = allowAdd && !readOnly;
  const canRemove = allowRemove && !readOnly;

  useEffect(() => {
    if (items.length === 0) {
      setExpandedItemIndex(null);
    } else if (items.length < previousItemCount.current) {
      setExpandedItemIndex((current) =>
        current !== null && current >= items.length ? items.length - 1 : current
      );
    }
    previousItemCount.current = items.length;
  }, [items.length]);

  const handleAddItemRow = () => {
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
        {canAdd && (
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
          {canAdd && addDisabled ? (
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Selecione o fornecedor acima para liberar a inclusão de itens.
            </Text>
          ) : null}
          {canAdd && showEmptyAddButton && (
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
          const receiptItem = item as MobilePurchaseItem & {
            freightUnit?: number;
            freightFiscalUnit?: number;
            freightNonFiscalUnit?: number;
            otherExpensesUnit?: number;
            otherExpensesFiscalUnit?: number;
            otherExpensesNonFiscalUnit?: number;
            additionalCostUnit?: number;
          };
          const receiptFreightUnit = Number(
            receiptItem.freightUnit ??
              Number(receiptItem.freightFiscalUnit || 0) +
                Number(receiptItem.freightNonFiscalUnit || 0),
          );
          const receiptOtherExpensesUnit = Number(
            receiptItem.otherExpensesUnit ??
              Number(receiptItem.otherExpensesFiscalUnit || 0) +
                Number(receiptItem.otherExpensesNonFiscalUnit || 0) +
                Number(receiptItem.additionalCostUnit || 0),
          );
          const itemTotal = itemCosts
            ? Number((Number(item.quantity || 0) * itemCosts.unitCost).toFixed(2))
            : Number(item.totalCost || 0);
          const summaryTotalCost = formatMoney(itemTotal);
          const isExpanded = expandedItemIndex === index;

          return (
            <Pressable
              key={`${item.productId}-${item.variationId || index}`}
              accessible={false}
              onPress={!isExpanded ? () => setExpandedItemIndex(index) : undefined}
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
                  style={[
                    styles.itemSummary,
                    isExpanded ? styles.itemSummaryExpanded : styles.itemSummaryCollapsed,
                  ]}
                  onPress={() => setExpandedItemIndex(isExpanded ? null : index)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={isExpanded
                    ? `Recolher item ${summaryProduct}`
                    : `Expandir ${summaryProduct}, quantidade ${item.quantity} un, custo total ${summaryTotalCost}`}
                  accessibilityState={{ expanded: isExpanded }}
                >
                  {!isExpanded && (
                    <Text style={[styles.itemName, { color: colors.text }]}>
                      {summaryProduct}
                    </Text>
                  )}
                  {!isExpanded && (
                    <View style={styles.itemSummaryMetaRow}>
                      <Text style={[styles.itemSummaryMeta, { color: colors.muted }]} numberOfLines={1}>
                        {item.quantity} un
                      </Text>
                      <Text style={[styles.itemSummaryTotal, { color: colors.text }]} numberOfLines={1}>
                        {simplifiedReceiptMode ? summaryTotalCost : `Total ${summaryTotalCost}`}
                      </Text>
                      <ChevronDown size={24} color={colors.muted} />
                    </View>
                  )}
                  {isExpanded && (
                    <View style={styles.collapseAction}>
                      <Text style={[styles.collapseActionText, { color: colors.muted }]}>
                        Recolher item
                      </Text>
                      <ChevronDown
                        size={24}
                        color={colors.muted}
                        style={{ transform: [{ rotate: '180deg' }] }}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <AnimatedPurchaseItemDetails expanded={isExpanded} reduceMotion={reduceMotion}>
                <>
                  {readOnly ? (
                    <View style={[styles.productInfo, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.productInfoText, { color: colors.text }]}>
                        {summaryProduct}
                      </Text>
                    </View>
                  ) : hasProduct ? (
                    <TouchableOpacity
                      style={[
                        styles.productSearchTrigger,
                        styles.productSearchTriggerSelected,
                        {
                          backgroundColor: colors.bg,
                          borderBottomColor: isDarkMode ? '#4ade80' : '#10b981',
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
                          {
                            color: colors.text,
                            flex: 1,
                            minWidth: 0,
                            flexShrink: 1,
                            fontWeight: '900',
                          },
                        ]}
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
                  {readOnly ? (
                    <View style={[styles.informationalValue, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.informationalValueText, { color: colors.text }]}>
                        {item.quantity}
                      </Text>
                    </View>
                  ) : (
                    <FormTextInput
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
                  )}
                </View>

                <View style={[styles.half, responsiveFieldRows && styles.responsiveHalf]}>
                  <Text style={[styles.label, { color: colors.muted }]}>
                    {receiptMode ? 'Custo unitário' : 'Custo base por unidade'}
                  </Text>
                  {readOnly ? (
                    <View style={[styles.informationalValue, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.informationalValueText, { color: colors.text }]}>
                        {formatMoney(Number(item.baseCost ?? item.unitCost ?? 0))}
                      </Text>
                    </View>
                  ) : (
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
                  )}
                </View>
              </View>

              {receiptMode && showReceiptCostComposition && (
                <>
                  <Text style={[styles.label, { color: colors.muted }]}>
                    Composição do custo
                  </Text>
                  <View style={styles.metricsGrid}>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.metricLabel, { color: colors.muted }]}>
                        Frete por unidade
                      </Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>
                        {formatMoney(receiptFreightUnit)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.metricLabel, { color: colors.muted }]}>
                        Outras despesas por unidade
                      </Text>
                      <Text style={[styles.metricValue, { color: colors.text }]}>
                        {formatMoney(receiptOtherExpensesUnit)}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {!receiptMode && !simplifiedReceiptMode && (
                <View style={styles.full}>
                  <Text style={[styles.label, { color: colors.muted }]}>Desconto por unidade</Text>
                  {readOnly ? (
                    <View style={[styles.informationalValue, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.informationalValueText, { color: colors.text }]}>
                        {formatMoney(Number(item.discountUnit || 0))}
                      </Text>
                    </View>
                  ) : (
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
                  )}
                </View>
              )}

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
              ) : receiptMode ? (
                <View style={styles.receiptItemFooter}>
                  {canRemove && isExpanded && (
                    <TouchableOpacity
                      onPress={(event) => {
                        event.stopPropagation();
                        handleRemoveItem(index);
                      }}
                      style={styles.removeItemButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${item.description || 'item'}`}
                    >
                      <Text style={styles.removeItemText}>Remover item</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={[styles.receiptItemTotal, { marginTop: 0, flexShrink: 1 }]}>
                    {simplifiedReceiptMode ? 'Custo total' : 'Subtotal'}: {formatMoney(itemTotal)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.receiptItemTotal}>
                  {simplifiedReceiptMode ? 'Custo total' : 'Subtotal'}: {formatMoney(itemTotal)}
                </Text>
              )}
                </>
              </AnimatedPurchaseItemDetails>
            </Pressable>
          );
        })
      )}

      {/* Botão para adicionar mais itens quando a lista já tem elementos */}
      {items.length > 0 && canAdd && (
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
