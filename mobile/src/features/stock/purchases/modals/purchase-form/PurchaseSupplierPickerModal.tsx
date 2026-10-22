import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import type { Supplier } from '../../hooks/usePurchaseForm';

interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

interface PurchaseSupplierPickerModalProps {
  visible: boolean;
  onClose: () => void;
  supplierSearch: string;
  setSupplierSearch: (search: string) => void;
  filteredSuppliers: Supplier[];
  onSelectSupplier: (supplier: Supplier) => void;
  colors: ThemeColors;
}

/**
 * Modal para busca e seleção de fornecedores no fluxo de pedidos de compra mobile.
 */
export const PurchaseSupplierPickerModal: React.FC<PurchaseSupplierPickerModalProps> = ({
  visible,
  onClose,
  supplierSearch,
  setSupplierSearch,
  filteredSuppliers,
  onSelectSupplier,
  colors,
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.flex, { backgroundColor: colors.bg }]}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Selecionar fornecedor</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TextInput
          autoFocus
          value={supplierSearch}
          onChangeText={setSupplierSearch}
          placeholder="Buscar fornecedor"
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            {
              margin: 16,
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {filteredSuppliers.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelectSupplier(item)}
              style={[
                styles.supplierRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pickerHeader: {
    padding: 18,
    paddingTop: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerTitle: { fontSize: 19, fontWeight: '900', color: '#0f172a' },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  supplierRow: { borderWidth: 1, borderRadius: 11, padding: 14 },
});
