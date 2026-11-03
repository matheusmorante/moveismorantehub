import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FormTextInput } from '../../../../../components/shared/FormTextInput';
import { Check, ChevronDown, Plus } from 'lucide-react-native';
import { CurrencyInput } from '../../../../../components/shared/CurrencyInput';
import { formatMoney, parseNumber } from '../../hooks/usePurchaseForm';
import { calculateMobilePurchaseItemCostBreakdown } from '../../hooks/useMobilePurchaseItems';
import type { PurchaseItemsSectionProps } from './purchaseItemsSection.types';

const ITEM_EXPANSION_DURATION_MS = 260;

export const usePurchaseItemReduceMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
};

export const AnimatedPurchaseItemDetails: React.FC<{ expanded: boolean; children: React.ReactNode; reduceMotion: boolean }> = ({ expanded, children, reduceMotion }) => {
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const mountedRef = useRef(expanded);
  const [mounted, setMounted] = useState(expanded);

  useEffect(() => {
    if (expanded) {
      mountedRef.current = true;
      setMounted(true);
    } else if (!mountedRef.current) {
      progress.setValue(0);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: reduceMotion ? 0 : ITEM_EXPANSION_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished && !expanded) {
        mountedRef.current = false;
        setMounted(false);
      }
    });
    return () => animation.stop();
  }, [expanded, progress]);

  if (!mounted) return null;
  return (
    <Animated.View
      pointerEvents={expanded ? 'auto' : 'none'}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      style={[styles.animatedItemDetails, {
        maxHeight: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 720] }),
        opacity: progress,
      }]}
    >
      {children}
    </Animated.View>
  );
};

export const PurchaseOrderItems: React.FC<PurchaseItemsSectionProps> = ({
  items, discountPercent = '0', ipiPercent = '0', freightPercent = '0',
  onOpenProductPicker, onAddItemRow, onUpdateItem, onRemoveItem, colors,
  selectedItemIndex = null, onSelectedItemChange,
  allowAdd = true, addDisabled = false, isDarkMode = false,
}) => {
  const [width, setWidth] = useState(0);
  const reduceMotion = usePurchaseItemReduceMotion();
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  const wide = width >= 768;
  const table = width >= 1200;
  const fieldWidth = width > 0 && width < 260 ? '100%' : '48%';
  const compositionWidth = width >= 768 ? '23%' : '48%';

  const addItem = () => {
    onSelectedItemChange?.(items.length);
    onAddItemRow();
  };
  const requestRemoveItem = (index: number) => {
    if (!items[index]) return;
    setPendingRemoveIndex(index);
  };
  const confirmRemoveItem = (index: number) => {
    if (!items[index]) return;
    onRemoveItem(index);
    onSelectedItemChange?.(null);
    setPendingRemoveIndex(null);
  };
  const renderRemoveConfirmation = (index: number, itemName: string) => (
    <View
      style={[styles.removeConfirmationOverlay, { backgroundColor: isDarkMode ? 'rgba(15,23,42,0.86)' : 'rgba(255,255,255,0.86)' }]}
      onTouchEnd={(event) => event.stopPropagation()}
      accessibilityRole="alert"
      accessibilityLabel={`Você tem certeza que quer remover o item? ${itemName}`}
    >
      <View style={[styles.removeConfirmationPanel, { backgroundColor: colors.surface, borderColor: isDarkMode ? '#7f1d1d' : '#fecaca' }]}>
        <Text style={[styles.removeConfirmationTitle, { color: colors.text }]}>Você tem certeza que quer remover o item?</Text>
        <Text style={[styles.removeConfirmationName, { color: colors.muted }]}>{itemName}</Text>
        <View style={styles.removeConfirmationActions}>
          <TouchableOpacity accessibilityRole="button" onPress={(event) => {
            event.stopPropagation();
            setPendingRemoveIndex(null);
          }} style={[styles.removeConfirmationButton, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            <Text style={[styles.removeConfirmationCancelText, { color: colors.text }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={(event) => {
            event.stopPropagation();
            confirmRemoveItem(index);
          }} style={styles.removeConfirmationButtonDanger}>
            <Text style={styles.removeConfirmationConfirmText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  const addButton = (bottom: boolean) => allowAdd ? (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Adicionar item" disabled={addDisabled}
      onPress={addItem} style={[bottom ? styles.bottomAdd : styles.headerAdd, { borderColor: colors.border }, addDisabled && styles.disabled]}>
      <Plus size={16} color="#2563eb" /><Text style={styles.addText}>Adicionar item</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.heading}>
        <Text style={[styles.headingText, { color: colors.text }]}>Itens ({items.length})</Text>
        {wide && addButton(false)}
      </View>
      {addDisabled && allowAdd && <Text style={[styles.helper, { color: colors.muted }]}>Selecione o fornecedor para adicionar itens.</Text>}
      {!items.length && <Text style={[styles.empty, { color: colors.muted }]}>Nenhum item adicionado ao pedido.</Text>}
      {table && items.length > 0 && <View style={styles.tableHead}>
        <Text style={[styles.label, styles.tableProduct, { color: colors.muted }]}>Produto</Text>
        <Text style={[styles.label, styles.tableQuantity, { color: colors.muted }]}>Qtd.</Text>
        <Text style={[styles.label, styles.tableMoney, { color: colors.muted }]}>Custo base un.</Text>
        <Text style={[styles.label, styles.tableMoney, { color: colors.muted }]}>Desconto un.</Text>
        <Text style={[styles.label, styles.tableMoney, { color: colors.muted }]}>IPI un.</Text>
        <Text style={[styles.label, styles.tableMoney, { color: colors.muted }]}>Frete un.</Text>
        <Text style={[styles.label, styles.tableMoney, { color: colors.muted }]}>Custo final un.</Text>
        <Text style={[styles.label, styles.tableMoney, { color: colors.muted }]}>Total do item</Text>
        <Text style={[styles.label, styles.tableAction, { color: colors.muted }]}>Ações</Text>
      </View>}
      {items.map((item, index) => {
        const hasProduct = Boolean(item.productId);
        const name = item.productId && item.description?.trim() ? item.description : 'Produto não informado';
        const costs = calculateMobilePurchaseItemCostBreakdown(
          Number(item.baseCost || 0), Number(item.discountUnit || 0), discountPercent, ipiPercent, freightPercent,
        );
        const total = Number((Number(item.quantity || 0) * costs.unitCost).toFixed(2));
        const expanded = selectedItemIndex === index;
        const confirmingRemove = pendingRemoveIndex === index;
        if (table) return (
          <Pressable key={`${item.productId}-${item.variationId || index}`} accessible={false}
            onPress={() => { if (!confirmingRemove) onSelectedItemChange?.(index); }}
            style={[styles.item, styles.confirmationHost, { borderColor: selectedItemIndex === index ? '#2563eb' : colors.border, backgroundColor: colors.surface }]}>
            <View pointerEvents={confirmingRemove ? 'none' : 'auto'} accessibilityElementsHidden={confirmingRemove}
              importantForAccessibility={confirmingRemove ? 'no-hide-descendants' : 'auto'}
              style={confirmingRemove ? styles.blurredItemContent : undefined}>
            <View style={styles.tableRow}>
              <TouchableOpacity style={styles.tableProduct} accessibilityRole="button" accessibilityLabel={`Selecionar ou alterar produto: ${name}`} onPress={() => onOpenProductPicker(index)}>
                <View style={[styles.productPickerNameRow, styles.productPickerNameBorder, { borderBottomColor: hasProduct ? '#10b981' : colors.border }]}>
                  <Text style={[styles.productName, { color: colors.text }]}>{name}</Text>
                  {hasProduct && <Check size={15} color={isDarkMode ? '#34d399' : '#059669'} />}
                </View>
              </TouchableOpacity>
              <View style={styles.tableQuantity}><FormTextInput accessibilityLabel={`Quantidade de ${name}`} value={String(item.quantity ?? '')}
                onChangeText={(value) => onUpdateItem(index, { quantity: parseNumber(value) })} keyboardType="decimal-pad"
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} /></View>
              <View style={styles.tableMoney}><CurrencyInput accessibilityLabel={`Custo base por unidade de ${name}`} value={Number(item.baseCost || 0)}
                onChangeValue={(value) => onUpdateItem(index, { baseCost: value || 0, unitCost: value || 0 })}
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.bg }]} color={colors.text} /></View>
              <Text style={[styles.tableMoney, styles.totalValue, { color: colors.text }]}>{formatMoney(costs.discountValue)}</Text>
              <Text style={[styles.tableMoney, styles.totalValue, { color: colors.text }]}>{formatMoney(costs.ipiValue)}</Text>
              <Text style={[styles.tableMoney, styles.totalValue, { color: colors.text }]}>{formatMoney(costs.freightValue)}</Text>
              <Text style={[styles.tableMoney, styles.totalValue, { color: colors.text }]}>{formatMoney(costs.unitCost)}</Text>
              <Text style={[styles.tableMoney, styles.totalValue, { color: isDarkMode ? '#a7f3d0' : '#047857' }]}>{formatMoney(total)}</Text>
              <View style={styles.tableAction}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remover item ${name}`} disabled={confirmingRemove} onPress={(event) => { event.stopPropagation(); requestRemoveItem(index); }}>
                  <Text style={styles.removeText}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
            </View>
            {confirmingRemove && renderRemoveConfirmation(index, name)}
          </Pressable>
        );
        return (
          <Pressable key={`${item.productId}-${item.variationId || index}`} accessible={false}
            onPress={!expanded && !confirmingRemove ? () => onSelectedItemChange?.(index) : undefined}
            style={[styles.item, styles.confirmationHost, { borderColor: expanded ? '#2563eb' : colors.border, backgroundColor: colors.surface }]}>
            <View pointerEvents={confirmingRemove ? 'none' : 'auto'} accessibilityElementsHidden={confirmingRemove}
              importantForAccessibility={confirmingRemove ? 'no-hide-descendants' : 'auto'}
              style={confirmingRemove ? styles.blurredItemContent : undefined}>
            <View style={styles.itemHeader}>
              <View style={styles.itemTitle}>
                <View style={styles.itemLabelRow}>
                  <Text style={[styles.eyebrow, { color: colors.muted }]}>Item {String(index + 1).padStart(2, '0')} · Produto</Text>
                  <View style={styles.itemActions}>
                    {expanded && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remover item ${name}`} onPress={(event) => {
                      event.stopPropagation();
                      requestRemoveItem(index);
                    }}>
                      <Text style={styles.removeText}>Remover item</Text>
                    </TouchableOpacity>}
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${expanded ? 'Recolher' : 'Expandir'} item ${name}`}
                      accessibilityState={{ expanded }} onPress={() => onSelectedItemChange?.(expanded ? null : index)}
                      style={styles.toggleButton}>
                      {expanded ? <Text style={[styles.toggleText, { color: colors.muted }]}>Recolher</Text> : <ChevronDown size={24} color={colors.muted} />}
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={styles.productPickerButton} accessibilityRole="button"
                  accessibilityLabel={expanded ? `Selecionar ou alterar produto: ${name}` : `Ver item: ${name}`}
                  onPress={() => expanded ? onOpenProductPicker(index) : onSelectedItemChange?.(index)}>
                  <View style={[styles.productPickerNameRow, styles.productPickerNameBorder, { borderBottomColor: hasProduct ? '#10b981' : colors.border }]}>
                    <Text style={[styles.productName, { color: colors.text }]}>{name}</Text>
                    {hasProduct && <Check size={15} color={isDarkMode ? '#34d399' : '#059669'} />}
                  </View>
                  {expanded ? <Text style={styles.productAction}>Toque no nome para selecionar ou alterar</Text> : (
                    <View style={styles.collapsedValues}>
                      <Text style={[styles.meta, styles.collapsedMeta, { color: colors.muted }]} numberOfLines={1}>
                        {item.quantity} un. · {formatMoney(costs.unitCost)}/un.
                      </Text>
                      <Text style={styles.collapsedTotal} numberOfLines={1}>Total do item {formatMoney(total)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <AnimatedPurchaseItemDetails expanded={expanded} reduceMotion={reduceMotion}>
              <>
              <View style={styles.fields}>
                <View style={{ width: fieldWidth }}>
                  <Text style={[styles.label, { color: colors.muted }]}>Quantidade</Text>
                  <FormTextInput accessibilityLabel={`Quantidade de ${name}`} value={String(item.quantity ?? '')}
                    onChangeText={(value) => onUpdateItem(index, { quantity: parseNumber(value) })} keyboardType="decimal-pad"
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]} />
                </View>
                <View style={{ width: fieldWidth }}>
                  <Text style={[styles.label, { color: colors.muted }]}>Custo base un.</Text>
                  <CurrencyInput accessibilityLabel={`Custo base por unidade de ${name}`} value={Number(item.baseCost || 0)}
                    onChangeValue={(value) => onUpdateItem(index, { baseCost: value || 0, unitCost: value || 0 })}
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.bg }]} color={colors.text} />
                </View>
              </View>
              <View style={[styles.costComposition, { borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.muted }]}>Composição do custo por unidade</Text>
                <View style={styles.compositionGrid}>
                  <View style={[styles.compositionValue, { width: compositionWidth, backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.compositionLabel, { color: colors.muted }]}>Desconto un.</Text>
                    <Text style={[styles.compositionAmount, { color: colors.text }]}>{formatMoney(costs.discountValue)}</Text>
                  </View>
                  <View style={[styles.compositionValue, { width: compositionWidth, backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.compositionLabel, { color: colors.muted }]}>IPI un.</Text>
                    <Text style={[styles.compositionAmount, { color: colors.text }]}>{formatMoney(costs.ipiValue)}</Text>
                  </View>
                  <View style={[styles.compositionValue, { width: compositionWidth, backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.compositionLabel, { color: colors.muted }]}>Frete un.</Text>
                    <Text style={[styles.compositionAmount, { color: colors.text }]}>{formatMoney(costs.freightValue)}</Text>
                  </View>
                  <View style={[styles.compositionValue, { width: compositionWidth, backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.compositionLabel, { color: colors.muted }]}>Custo final un.</Text>
                    <Text style={[styles.compositionAmount, { color: colors.text }]}>{formatMoney(costs.unitCost)}</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.itemTotal, { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' }]}>
                <Text style={[styles.label, { color: isDarkMode ? '#a7f3d0' : '#047857' }]}>Total do item</Text>
                <Text style={[styles.totalValue, { color: isDarkMode ? '#a7f3d0' : '#047857' }]}>{formatMoney(total)}</Text>
              </View>
              </>
            </AnimatedPurchaseItemDetails>
            </View>
            {confirmingRemove && renderRemoveConfirmation(index, name)}
          </Pressable>
        );
      })}
      {!wide && addButton(true)}

    </View>
  );
};

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headingText: { fontSize: 14, fontWeight: '900' },
  headerAdd: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8 },
  bottomAdd: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 11 },
  addText: { color: '#2563eb', fontWeight: '800', fontSize: 12 },
  disabled: { opacity: 0.5 },
  helper: { fontSize: 11, lineHeight: 16 },
  empty: { textAlign: 'center', paddingVertical: 14, fontSize: 13 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  confirmationHost: { position: 'relative', overflow: 'hidden' },
  blurredItemContent: { filter: [{ blur: 3 }], opacity: 0.3 },
  removeConfirmationOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 5, elevation: 5, alignItems: 'center', justifyContent: 'center', padding: 8 },
  removeConfirmationPanel: { width: '100%', borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, shadowColor: '#0f172a', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  removeConfirmationTitle: { fontSize: 13, fontWeight: '900', lineHeight: 18 },
  removeConfirmationName: { fontSize: 12, fontWeight: '700', lineHeight: 17 },
  removeConfirmationActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  removeConfirmationButton: { minHeight: 38, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  removeConfirmationButtonDanger: { minHeight: 38, borderRadius: 9, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  removeConfirmationCancelText: { fontSize: 12, fontWeight: '800' },
  removeConfirmationConfirmText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  animatedItemDetails: { overflow: 'hidden', gap: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  itemTitle: { flex: 1, minWidth: 0 },
  itemLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tableProduct: { flex: 1, minWidth: 0 },
  tableQuantity: { width: 50, flexGrow: 0, flexShrink: 0 },
  tableMoney: { width: 90, flexGrow: 0, flexShrink: 0 },
  tableAction: { width: 64, flexGrow: 0, flexShrink: 0, alignItems: 'flex-end' },
  productPickerNameRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrow: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  productName: { flex: 1, minWidth: 0, flexShrink: 1, fontSize: 13, fontWeight: '900', marginTop: 4 },
  productPickerButton: { paddingBottom: 5 },
  productPickerNameBorder: { borderBottomWidth: 2, paddingBottom: 5 },
  productAction: { color: '#2563eb', fontSize: 10, marginTop: 3 },
  meta: { fontSize: 11, marginTop: 3 },
  collapsedValues: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 },
  collapsedMeta: { flex: 1, minWidth: 0, marginTop: 0 },
  collapsedTotal: { color: '#059669', fontWeight: '900', fontSize: 11, flexShrink: 1, maxWidth: '55%', textAlign: 'right' },
  toggleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 34, minHeight: 34, flexShrink: 0, paddingHorizontal: 7 },
  toggleText: { fontSize: 11, fontWeight: '700' },
  removeText: { color: '#dc2626', fontSize: 11, fontWeight: '800' },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
  input: { minHeight: 44, borderWidth: 0, borderBottomWidth: 2, borderRadius: 0, paddingHorizontal: 4, fontSize: 13 },
  costComposition: { borderTopWidth: 1, paddingTop: 10, gap: 7 },
  compositionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  compositionValue: { flexGrow: 1, minWidth: 0, borderWidth: 1, borderRadius: 10, padding: 9, gap: 4 },
  compositionLabel: { minHeight: 22, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  compositionAmount: { fontSize: 12, fontWeight: '800' },
  itemTotal: { minWidth: 0, minHeight: 44, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  totalValue: { fontSize: 14, fontWeight: '900' },
});
