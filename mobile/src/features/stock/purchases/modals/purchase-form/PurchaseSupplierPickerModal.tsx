import { FormTextInput } from '../../../../../components/shared/FormTextInput';
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
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
  loading: boolean;
  errorMessage: string;
  offlineResults: boolean;
  onRetry: () => void;
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
  loading,
  errorMessage,
  offlineResults,
  onRetry,
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
        <FormTextInput
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
          {offlineResults ? (
            <Text style={[styles.offlineNotice, { color: colors.muted }]}>
              Resultados salvos neste aparelho. Podem estar desatualizados; serão conferidos ao reconectar.
            </Text>
          ) : null}
          {loading ? (
            <View style={styles.statusContainer}>
              <ActivityIndicator color={colors.muted} />
              <Text style={{ color: colors.muted }}>Carregando fornecedores...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.statusContainer}>
              <Text style={{ color: colors.muted, textAlign: 'center' }}>{errorMessage}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={onRetry}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : filteredSuppliers.length ? (
            filteredSuppliers.map((item) => (
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
            ))
          ) : (
            <Text style={[styles.statusText, { color: colors.muted }]}>Nenhum fornecedor encontrado.</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  offlineNotice: { padding: 10, textAlign: 'center' },
  statusContainer: { minHeight: 96, gap: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  statusText: { paddingVertical: 28, textAlign: 'center' },
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
