import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { LockKeyhole } from 'lucide-react-native';

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
        {supplierLocked ? (
          <View style={styles.lockedLabel}>
            <LockKeyhole size={12} color="#d97706" />
            <Text style={styles.lockedText}>Fixado</Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: supplierLocked }}
        accessibilityHint={supplierLocked ? 'Remova todos os itens do pedido para trocar o fornecedor.' : undefined}
        disabled={supplierLocked}
        style={[
          styles.selector,
          { borderColor: colors.border, backgroundColor: colors.bg },
          supplierLocked && styles.selectorLocked,
        ]}
        onPress={onOpenSupplierPicker}
      >
        <Text style={{ color: supplierName ? colors.text : colors.muted, flex: 1 }}>
          {supplierName || 'Selecione um fornecedor'}
        </Text>
        {supplierLocked ? (
          <LockKeyhole size={16} color="#d97706" />
        ) : (
          <Text style={{ color: '#2563eb', fontWeight: '800' }}>Selecionar</Text>
        )}
      </TouchableOpacity>
      {supplierLocked ? (
        <Text style={[styles.lockedHint, { color: colors.muted }]}>
          Remova todos os itens para trocar o fornecedor.
        </Text>
      ) : null}

      <Text style={[styles.label, { color: colors.muted }]}>Data do pedido</Text>
      <TextInput
        value={date}
        onChangeText={setDate}
        placeholder="AAAA-MM-DD"
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
        ]}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.muted }]}>Desconto (%)</Text>
          <TextInput
            value={discountPercent}
            onChangeText={setDiscountPercent}
            keyboardType="decimal-pad"
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
          />
        </View>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.muted }]}>IPI (%)</Text>
          <TextInput
            value={ipiPercent}
            onChangeText={setIpiPercent}
            keyboardType="decimal-pad"
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
          />
        </View>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.muted }]}>Frete (%)</Text>
          <TextInput
            value={freightPercent}
            onChangeText={setFreightPercent}
            keyboardType="decimal-pad"
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
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
  lockedLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockedText: { color: '#d97706', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  lockedHint: { fontSize: 10, marginTop: -5 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  selector: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorLocked: { opacity: 0.72 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  half: { flex: 1, minWidth: 132 },
});
