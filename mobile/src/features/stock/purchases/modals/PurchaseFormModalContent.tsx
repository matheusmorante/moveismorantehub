import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import {
  InventoryProductSearchModal,
} from '../../inventory/components/InventoryProductSearchModal';
import {
  MobilePurchase,
} from '../mobilePurchaseService';
import { usePurchaseForm, formatMoney } from '../hooks/usePurchaseForm';
import { PurchaseOrderDetailsSection } from '../components/PurchaseOrderDetailsSection';
import { PurchaseItemsSection } from '../components/PurchaseItemsSection';
import { PurchaseSupplierPickerModal } from '../components/PurchaseSupplierPickerModal';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  purchase?: MobilePurchase | null;
  onClose: () => void;
  onSaved: () => void;
}
/**
 * Content component for the purchase form modal. All UI/logic lives here.
 */
export const PurchaseFormModalContent: React.FC<Props> = ({
  visible,
  isDarkMode,
  purchase,
  onClose,
  onSaved,
}) => {
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    surface: isDarkMode ? '#1e293b' : '#fff',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    text: isDarkMode ? '#f8fafc' : '#0f172a',
    muted: isDarkMode ? '#94a3b8' : '#64748b',
  };

  const {
    filteredSuppliers,
    supplierSearch,
    setSupplierSearch,
    supplierOpen,
    setSupplierOpen,
    setSupplierId,
    supplierName,
    setSupplierName,
    date,
    setDate,
    observation,
    setObservation,
    ipiPercent,
    setIpiPercent,
    freightPercent,
    setFreightPercent,
    items,
    addProduct,
    updateItem,
    removeItem,
    total,
    productPickerOpen,
    setProductPickerOpen,
    saving,
    handleSave,
  } = usePurchaseForm({
    visible,
    purchase,
    onClose,
    onSaved,
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#2563eb' }]}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>
              {purchase ? 'Editar pedido de compra' : 'Novo pedido de compra'}
            </Text>
            <Text style={styles.headerSubtitle}>Produtos e variações</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Form with scroll */}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <PurchaseOrderDetailsSection
            supplierName={supplierName}
            onOpenSupplierPicker={() => setSupplierOpen(true)}
            date={date}
            setDate={setDate}
            ipiPercent={ipiPercent}
            setIpiPercent={setIpiPercent}
            freightPercent={freightPercent}
            setFreightPercent={setFreightPercent}
            colors={colors}
          />

          <PurchaseItemsSection
            items={items}
            onOpenProductPicker={() => setProductPickerOpen(true)}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            colors={colors}
          />

          {/* Observation section */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Observação</Text>
            <TextInput
              value={observation}
              onChangeText={setObservation}
              multiline
              placeholder="Observações do pedido"
              placeholderTextColor={colors.muted}
              style={[
                styles.textArea,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
              ]}
            />
          </View>

          {/* Order total */}
          <View
            style={[
              styles.totalBox,
              { borderColor: '#a7f3d0', backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' },
            ]}
          >
            <Text style={{ color: isDarkMode ? '#a7f3d0' : '#047857', fontWeight: '900' }}>
              Total do pedido
            </Text>
            <Text
              style={{ color: isDarkMode ? '#a7f3d0' : '#047857', fontWeight: '900', fontSize: 20 }}
            >
              {formatMoney(total)}
            </Text>
          </View>
        </ScrollView>

        {/* Footer actions */}
        <View
          style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <TouchableOpacity
            onPress={onClose}
            style={[styles.cancelButton, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.muted, fontWeight: '800' }}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={saving}
            onPress={() => void handleSave()}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>
                {purchase ? 'Salvar alterações' : 'Confirmar pedido'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Supplier picker modal */}
      <PurchaseSupplierPickerModal
        visible={supplierOpen}
        onClose={() => setSupplierOpen(false)}
        supplierSearch={supplierSearch}
        setSupplierSearch={setSupplierSearch}
        filteredSuppliers={filteredSuppliers}
        onSelectSupplier={(supplier) => {
          setSupplierId(supplier.id);
          setSupplierName(supplier.name);
          setSupplierOpen(false);
        }}
        colors={colors}
      />

      {/* Product search modal */}
      <InventoryProductSearchModal
        isDarkMode={isDarkMode}
        visible={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        onSelect={addProduct}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    minHeight: 82,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,.8)', marginTop: 3 },
  iconButton: { padding: 6 },
  content: { padding: 16, gap: 14 },
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 9 },
  sectionTitle: { fontSize: 14, fontWeight: '900', marginBottom: 3 },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
  },
  totalBox: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: { borderTopWidth: 1, padding: 12, flexDirection: 'row', gap: 10 },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1.4,
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '900' },
});
