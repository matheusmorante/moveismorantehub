import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

interface PurchaseOrderDetailsSectionProps {
  supplierName: string;
  onOpenSupplierPicker: () => void;
  date: string;
  setDate: (date: string) => void;
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
  onOpenSupplierPicker,
  date,
  setDate,
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

      <Text style={[styles.label, { color: colors.muted }]}>Fornecedor</Text>
      <TouchableOpacity
        style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.bg }]}
        onPress={onOpenSupplierPicker}
      >
        <Text style={{ color: supplierName ? colors.text : colors.muted, flex: 1 }}>
          {supplierName || 'Selecione um fornecedor'}
        </Text>
        <Text style={{ color: '#2563eb', fontWeight: '800' }}>Selecionar</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { color: colors.muted }]}>Data</Text>
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
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  selector: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
