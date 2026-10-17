import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { CurrencyInput } from '../../../../components/shared/CurrencyInput';
import type { MobilePurchaseItem } from '../mobilePurchaseService';
import { formatMoney, parseNumber } from '../hooks/usePurchaseForm';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

interface PurchaseItemsSectionProps {
  items: MobilePurchaseItem[];
  onOpenProductPicker: () => void;
  onUpdateItem: (index: number, patch: Partial<MobilePurchaseItem>) => void;
  onRemoveItem: (index: number) => void;
  colors: ThemeColors;
}

/**
 * Seção de itens do pedido de compra com adição via picker, edição de quantidade/custo e exclusão.
 */
export const PurchaseItemsSection: React.FC<PurchaseItemsSectionProps> = ({
  items,
  onOpenProductPicker,
  onUpdateItem,
  onRemoveItem,
  colors,
}) => {
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
        <TouchableOpacity style={styles.addButton} onPress={onOpenProductPicker}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          Nenhum item adicionado. Selecione a variação do produto.
        </Text>
      ) : (
        items.map((item, index) => (
          <View
            key={`${item.productId}-${item.variationId || index}`}
            style={[styles.item, { borderColor: colors.border }]}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemCopy}>
                <Text style={[styles.itemName, { color: colors.text }]}>
                  {item.description}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  {item.sku ? `SKU ${item.sku}` : 'Variação selecionada'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => onRemoveItem(index)}>
                <Trash2 size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={[styles.label, { color: colors.muted }]}>Quantidade</Text>
                <TextInput
                  value={String(item.quantity)}
                  onChangeText={(value) =>
                    onUpdateItem(index, { quantity: parseNumber(value) })
                  }
                  keyboardType="decimal-pad"
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

              <View style={styles.half}>
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

            <Text style={[styles.itemTotal, { color: '#059669' }]}>
              Subtotal:{' '}
              {formatMoney(
                Number(item.quantity || 0) * Number(item.unitCost || item.baseCost || 0)
              )}
            </Text>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 9 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 3 },
  label: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 5 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
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
  emptyText: { textAlign: 'center', paddingVertical: 20, lineHeight: 18 },
  item: { borderWidth: 1, borderRadius: 12, padding: 11, gap: 6 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemCopy: { flex: 1 },
  itemName: { fontWeight: '900', fontSize: 13 },
  itemTotal: { textAlign: 'right', fontSize: 12, fontWeight: '900' },
});
