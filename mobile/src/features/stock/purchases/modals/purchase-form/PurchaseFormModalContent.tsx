import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  InventoryProductSearchModal,
} from '../../../inventory/components/InventoryProductSearchModal';
import { MobilePurchase, purchaseStatusLabel } from '../../mobilePurchaseService';
import { usePurchaseForm, formatMoney } from '../../hooks/usePurchaseForm';
import { PurchaseOrderDetailsSection } from './PurchaseOrderDetailsSection';
import { PurchaseItemsSection } from './PurchaseItemsSection';
import { PurchaseAttachmentsSection } from './PurchaseAttachmentsSection';
import { PurchaseSupplierPickerModal } from './PurchaseSupplierPickerModal';

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
  const [selectedItemIndex, setSelectedItemIndex] = React.useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 0);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);
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
    supplierId,
    date,
    setDate,
    discountPercent,
    setDiscountPercent,
    ipiPercent,
    setIpiPercent,
    freightPercent,
    setFreightPercent,
    items,
    attachments,
    isUploading,
    addAttachments,
    removeAttachment,
    addProduct,
    openProductPicker,
    addItemRow,
    handleProductSelect,
    updateItem,
    removeItem,
    total,
    productPickerOpen,
    setProductPickerOpen,
    saving,
    isDraftSession,
    hasDraftChanges,
    draftSaveStatus,
    handleClose,
    handleSave,
    confirmationBlockReasons,
  } = usePurchaseForm({
    visible,
    purchase,
    onClose,
    onSaved,
  });

  React.useEffect(() => {
    setSelectedItemIndex(null);
  }, [visible, purchase?.id]);

  const draftStatusText = draftSaveStatus === 'saving'
    ? 'Salvando rascunho…'
    : draftSaveStatus === 'error'
      ? 'Não foi possível salvar o rascunho'
      : hasDraftChanges
        ? 'Alterações aguardando salvamento'
        : draftSaveStatus === 'saved' || purchase?.status === 'draft'
          ? 'Rascunho salvo'
          : 'Preencha um campo para iniciar o rascunho';
  const [showConfirmationBlockReasons, setShowConfirmationBlockReasons] = React.useState(false);
  const confirmationBlockKey = confirmationBlockReasons.join('|');

  React.useEffect(() => {
    setShowConfirmationBlockReasons(false);
  }, [visible, confirmationBlockKey]);

  const handleOpenAttachment = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível abrir o anexo', 'Confira sua conexão e tente novamente.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!isUploading) void handleClose();
      }}
    >
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.bg, paddingTop: topInset, paddingBottom: bottomInset }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#2563eb' }]}>
          <View style={styles.headerCopy}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {purchase ? 'Editar pedido de compra' : 'Novo pedido de compra'}
              </Text>
              {purchase?.id ? (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{purchaseStatusLabel(purchase.status)}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Fechar pedido de compra"
            disabled={isUploading}
            onPress={() => void handleClose()}
            style={[styles.iconButton, isUploading && styles.disabled]}
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Form with scroll */}
        <ScrollView
          pointerEvents={saving || isUploading ? 'none' : 'auto'}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <PurchaseOrderDetailsSection
            supplierName={supplierName}
            supplierLocked={Boolean(supplierId && items.length > 0)}
            onOpenSupplierPicker={() => setSupplierOpen(true)}
            date={date}
            setDate={setDate}
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            ipiPercent={ipiPercent}
            setIpiPercent={setIpiPercent}
            freightPercent={freightPercent}
            setFreightPercent={setFreightPercent}
            colors={colors}
          />

          <PurchaseAttachmentsSection
            attachments={attachments}
            isUploading={isUploading}
            colors={colors}
            onAdd={() => void addAttachments()}
            onOpen={(url) => void handleOpenAttachment(url)}
            onRemove={removeAttachment}
          />

          <PurchaseItemsSection
            items={items}
            discountPercent={discountPercent}
            ipiPercent={ipiPercent}
            freightPercent={freightPercent}
            onOpenProductPicker={openProductPicker}
            onAddItemRow={addItemRow}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            colors={colors}
            selectedItemIndex={selectedItemIndex}
            onSelectedItemChange={setSelectedItemIndex}
            showEmptyAddButton={false}
            addDisabled={!supplierId}
            responsiveFieldRows
            isDarkMode={isDarkMode}
          />

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
          {isDraftSession ? (
            <Text style={[styles.draftStatus, { color: colors.muted }]} accessibilityRole="text">
              {draftStatusText}
            </Text>
          ) : null}
          {showConfirmationBlockReasons && confirmationBlockReasons.length > 0 ? (
            <View
              nativeID="purchase-confirmation-block-reasons"
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
              accessibilityLabel={confirmationBlockReasons.join(' ')}
              style={[
                styles.confirmationTooltip,
                {
                  backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2',
                  borderColor: isDarkMode ? '#7f1d1d' : '#fecaca',
                },
              ]}
            >
              {confirmationBlockReasons.map((reason) => (
                <Text key={reason} style={{ color: isDarkMode ? '#fecaca' : '#991b1b', fontWeight: '700' }}>
                  {reason}
                </Text>
              ))}
            </View>
          ) : null}
          <View style={styles.footerButtons}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={saving || isUploading}
              accessibilityState={{ disabled: saving || isUploading }}
              accessibilityHint={confirmationBlockReasons.length > 0
                ? `Confirmação indisponível. ${confirmationBlockReasons.join(' ')} Toque para ver os pré-requisitos.`
                : undefined}
              onPress={() => {
                if (saving || isUploading) return;
                if (confirmationBlockReasons.length > 0) {
                  setShowConfirmationBlockReasons(true);
                  return;
                }
                setShowConfirmationBlockReasons(false);
                void handleSave();
              }}
              style={[styles.saveButton, (saving || isUploading || confirmationBlockReasons.length > 0) && styles.disabled]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>
                  {purchase?.id && purchase.status !== 'draft' ? 'Salvar alterações' : 'Confirmar pedido'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
        onSelect={handleProductSelect}
        supplierId={supplierId || undefined}
        activeOnly
        subtitle={supplierName ? `Produtos de ${supplierName}` : 'Selecione uma variação para adicionar'}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    minHeight: 60,
    paddingHorizontal: 18,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', flexShrink: 1 },
  statusBadge: { backgroundColor: 'rgba(255,255,255,.18)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  content: { padding: 16, gap: 14 },
  totalBox: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: { borderTopWidth: 1, padding: 12, gap: 8 },
  footerButtons: { flexDirection: 'row', gap: 10 },
  confirmationTooltip: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, gap: 3 },
  draftStatus: { fontSize: 11, fontWeight: '700', paddingHorizontal: 2 },
  saveButton: {
    flex: 1.3,
    minWidth: 0,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '900' },
});
