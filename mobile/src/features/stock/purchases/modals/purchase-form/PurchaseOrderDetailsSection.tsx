import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, LockKeyhole } from 'lucide-react-native';
import { PercentInput } from '../../../../../components/shared/PercentInput';
import { parseNumber } from '../../hooks/useMobilePurchaseItems';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

interface PurchaseOrderDetailsSectionProps {
  supplierName: string;
  supplierLocked?: boolean;
  onOpenSupplierPicker: () => void;
  date: string;
  setDate: (date: string) => void;
  discountPercent: string;
  setDiscountPercent: (val: string) => void;
  ipiPercent: string;
  setIpiPercent: (val: string) => void;
  freightPercent: string;
  setFreightPercent: (val: string) => void;
  colors: ThemeColors;
}

/**
 * Seção de cabeçalho do pedido de compra contendo fornecedor, data, IPI e frete percentual.
 */
export const PurchaseOrderDetailsSection: React.FC<PurchaseOrderDetailsSectionProps> = ({
  supplierName,
  supplierLocked = false,
  onOpenSupplierPicker,
  date,
  setDate,
  discountPercent,
  setDiscountPercent,
  ipiPercent,
  setIpiPercent,
  freightPercent,
  setFreightPercent,
  colors,
}) => {
  const [showSupplierLockTooltip, setShowSupplierLockTooltip] = React.useState(false);
  const supplierSelected = Boolean(supplierName.trim());

  React.useEffect(() => {
    if (!supplierLocked) setShowSupplierLockTooltip(false);
  }, [supplierLocked]);

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados do pedido</Text>

      <View style={styles.supplierLabelRow}>
        <Text style={[styles.label, { color: colors.muted }]}>Fornecedor</Text>
      </View>
      <View style={styles.supplierFieldContainer}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={supplierLocked ? 'Fornecedor selecionado. Toque para ver como liberar o campo.' : supplierSelected ? 'Alterar fornecedor selecionado' : 'Selecionar fornecedor'}
          accessibilityState={{ expanded: supplierLocked && showSupplierLockTooltip }}
          accessibilityHint={supplierLocked ? 'Remova todos os itens do pedido para trocar o fornecedor.' : undefined}
          style={[
            styles.selector,
            {
              borderBottomColor: supplierSelected ? '#10b981' : colors.border,
              backgroundColor: 'transparent',
            },
          ]}
          onPress={() => supplierLocked
            ? setShowSupplierLockTooltip((visible) => !visible)
            : onOpenSupplierPicker()}
        >
          <Text style={{ color: supplierName ? colors.text : colors.muted, flex: 1 }}>
            {supplierName || 'Selecione um fornecedor'}
          </Text>
          {supplierSelected ? (
            <View style={styles.supplierIcons}>
              <Check size={16} color="#059669" />
              {supplierLocked ? <LockKeyhole size={16} color="#d97706" /> : null}
            </View>
          ) : (
            supplierLocked
              ? <LockKeyhole size={16} color="#d97706" />
              : <Text style={{ color: '#2563eb', fontWeight: '800' }}>Selecionar</Text>
          )}
        </TouchableOpacity>
        {supplierLocked && showSupplierLockTooltip ? (
          <View style={[styles.lockedTooltip, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityRole="text">
            <Text style={[styles.lockedTooltipText, { color: colors.text }]}>
              Para liberar o campo, remova todos os itens deste pedido.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.muted }]}>Data do pedido</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { color: colors.text, borderBottomColor: colors.border, backgroundColor: 'transparent' },
            ]}
          />
        </View>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.muted }]}>Desconto (%)</Text>
          <PercentInput
            value={discountPercent ? parseNumber(discountPercent) : null}
            onChangeValue={(value) => setDiscountPercent(value === null ? '' : String(value))}
            accessibilityLabel="Desconto (%)"
            color={colors.text}
            style={[
              styles.input,
              { color: colors.text, borderBottomColor: colors.border, backgroundColor: 'transparent' },
            ]}
          />
        </View>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.muted }]}>IPI (%)</Text>
          <PercentInput
            value={ipiPercent ? parseNumber(ipiPercent) : null}
            onChangeValue={(value) => setIpiPercent(value === null ? '' : String(value))}
            accessibilityLabel="IPI (%)"
            color={colors.text}
            style={[
              styles.input,
              { color: colors.text, borderBottomColor: colors.border, backgroundColor: 'transparent' },
            ]}
          />
        </View>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.muted }]}>Frete (%)</Text>
          <PercentInput
            value={freightPercent ? parseNumber(freightPercent) : null}
            onChangeValue={(value) => setFreightPercent(value === null ? '' : String(value))}
            accessibilityLabel="Frete (%)"
            color={colors.text}
            style={[
              styles.input,
              { color: colors.text, borderBottomColor: colors.border, backgroundColor: 'transparent' },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 9 },
  sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 3 },
  label: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 5 },
  supplierLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  supplierFieldContainer: { position: 'relative', zIndex: 5 },
  lockedTooltip: { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, elevation: 10, marginTop: 6, borderWidth: 1, borderRadius: 10, padding: 10, shadowColor: '#0f172a', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  lockedTooltipText: { fontSize: 11, fontWeight: '700', lineHeight: 16 },
  input: { minHeight: 44, borderWidth: 0, borderBottomWidth: 1, borderRadius: 0, paddingHorizontal: 4, fontSize: 14 },
  selector: {
    minHeight: 44,
    borderWidth: 0,
    borderBottomWidth: 2,
    borderRadius: 0,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  half: { flex: 1, minWidth: 132, gap: 4 },
});
