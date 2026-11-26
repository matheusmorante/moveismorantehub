import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { FormTextInput } from '../../../../components/shared/FormTextInput';
import { PurchaseAttachmentsSection } from '../../purchases/modals/purchase-form/PurchaseAttachmentsSection';
import { PurchaseItemsSection } from '../../purchases/modals/purchase-form/PurchaseItemsSection';
import { ReceiptRateioField, type RateioMode } from './ReceiptRateioField';
import { ReceiptSupplierField } from './ReceiptSupplierField';
import { ReceiptTotalSummary } from './ReceiptTotalSummary';
import { styles } from './newGoodsReceiptModal.styles';
import type { MobileReceiptItem, ReceiptOrigin } from '../utils/receiptSource';

interface ReceiptThemeColors {
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
}

interface NewGoodsReceiptFormBodyProps {
  colors: ReceiptThemeColors;
  isDarkMode: boolean;
  saving: boolean;
  resumeSourceLoading: boolean;
  resumeSourceError: string;
  isInvoiceLinkedReceipt: boolean;
  isEditingReceipt: boolean;
  origin: ReceiptOrigin;
  selectedSupplierName?: string;
  supplierId: string;
  supplierSelected: boolean;
  supplierLocked: boolean;
  showSupplierLockTooltip: boolean;
  supplierLoadError: string;
  loadingSuppliers: boolean;
  itemsCount: number;
  formattedReceiptDate: string;
  attachments: any[];
  isUploadingAttachments: boolean;
  nonFiscalFreightMode: RateioMode;
  nonFiscalFreightInput: string;
  nonFiscalOtherExpensesMode: RateioMode;
  nonFiscalOtherExpensesInput: string;
  rateioBaseTotal: number;
  processedItems: MobileReceiptItem[];
  observation: string;
  totalValue: number;
  onSupplierPress: () => void;
  onOpenDatePicker: () => void;
  onAddAttachments: () => void;
  onRemoveAttachment: (index: number) => void;
  onFreightModeChange: (mode: RateioMode) => void;
  onFreightInputChange: (value: string) => void;
  onOtherExpensesModeChange: (mode: RateioMode) => void;
  onOtherExpensesInputChange: (value: string) => void;
  onOpenProductPicker: () => void;
  onUpdateItem: (index: number, patch: Partial<MobileReceiptItem>) => void;
  onRemoveItem: (index: number) => void;
  onObservationChange: (value: string) => void;
}

/** Corpo rolável do formulário de recebimento com fornecedor, data, anexos, rateio não fiscal e itens. */
export const NewGoodsReceiptFormBody: React.FC<NewGoodsReceiptFormBodyProps> = ({
  colors,
  isDarkMode,
  saving,
  resumeSourceLoading,
  resumeSourceError,
  isInvoiceLinkedReceipt,
  isEditingReceipt,
  origin,
  selectedSupplierName,
  supplierId,
  supplierSelected,
  supplierLocked,
  showSupplierLockTooltip,
  supplierLoadError,
  loadingSuppliers,
  itemsCount,
  formattedReceiptDate,
  attachments,
  isUploadingAttachments,
  nonFiscalFreightMode,
  nonFiscalFreightInput,
  nonFiscalOtherExpensesMode,
  nonFiscalOtherExpensesInput,
  rateioBaseTotal,
  processedItems,
  observation,
  totalValue,
  onSupplierPress,
  onOpenDatePicker,
  onAddAttachments,
  onRemoveAttachment,
  onFreightModeChange,
  onFreightInputChange,
  onOtherExpensesModeChange,
  onOtherExpensesInputChange,
  onOpenProductPicker,
  onUpdateItem,
  onRemoveItem,
  onObservationChange,
}) => (
  <ScrollView
    pointerEvents={saving || resumeSourceLoading ? 'none' : 'auto'}
    contentContainerStyle={styles.content}
    keyboardShouldPersistTaps="handled"
  >
    {resumeSourceLoading ? (
      <View style={styles.resumeNotice}>
        <ActivityIndicator size="small" color="#059669" />
        <Text style={[styles.hint, { color: colors.muted }]}>Conferindo a nota vinculada…</Text>
      </View>
    ) : null}
    {resumeSourceError ? (
      <View style={styles.resumeError}>
        <Text style={styles.errorText}>{resumeSourceError}</Text>
      </View>
    ) : null}
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <ReceiptSupplierField
        colors={colors}
        isInvoiceLinkedReceipt={isInvoiceLinkedReceipt}
        selectedSupplierName={selectedSupplierName}
        originSupplierName={origin.supplierName}
        supplierSelected={supplierSelected}
        supplierLocked={supplierLocked}
        showSupplierLockTooltip={showSupplierLockTooltip}
        supplierLoadError={origin.kind !== 'invoice' ? supplierLoadError : ''}
        buttonDisabled={
          loadingSuppliers ||
          (isEditingReceipt ? Boolean(origin.fiscalKey) : origin.kind !== 'manual')
        }
        showLockIcon={supplierLocked || (isEditingReceipt && Boolean(origin.fiscalKey))}
        showManualLoading={origin.kind === 'manual' && itemsCount === 0 && loadingSuppliers}
        showManualChoose={origin.kind === 'manual' && itemsCount === 0}
        onSupplierPress={onSupplierPress}
      />

      <Text style={[styles.label, { color: colors.text }]}>Data de recebimento *</Text>
      <TouchableOpacity
        onPress={onOpenDatePicker}
        accessibilityRole="button"
        accessibilityLabel={`Data de recebimento ${formattedReceiptDate}. Abrir calendário.`}
        style={[
          styles.dateField,
          {
            backgroundColor: colors.bg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
          {formattedReceiptDate}
        </Text>
        <CalendarDays size={18} color={colors.muted} />
      </TouchableOpacity>
    </View>

    <PurchaseAttachmentsSection
      attachments={attachments}
      isUploading={isUploadingAttachments}
      colors={colors}
      recordLabel="recebimento"
      onAdd={onAddAttachments}
      onOpen={(url) => {
        void Linking.openURL(url).catch(() =>
          Alert.alert('Não foi possível abrir o anexo', 'Confira sua conexão e tente novamente.'),
        );
      }}
      onRemove={onRemoveAttachment}
    />

    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.rateioSectionHeader}>
        <Text style={[styles.rateioSectionTitle, { color: colors.text }]}>
          {isInvoiceLinkedReceipt ? 'Despesas não fiscais' : 'Despesas'}
        </Text>
        <Text style={[styles.rateioHint, { color: colors.muted }]}>
          {isInvoiceLinkedReceipt
            ? isEditingReceipt
              ? 'Custos cobrados fora da nota fiscal, rateados entre os itens.'
              : 'Informe custos cobrados fora da nota fiscal; eles serão rateados entre os itens.'
            : 'Os valores serão rateados entre os itens.'}
        </Text>
      </View>
      <View style={styles.rateioGrid}>
        <ReceiptRateioField
          label="Frete"
          mode={nonFiscalFreightMode}
          value={nonFiscalFreightInput}
          baseTotal={rateioBaseTotal}
          readOnly={isInvoiceLinkedReceipt && isEditingReceipt}
          colors={colors}
          isDarkMode={isDarkMode}
          onModeChange={onFreightModeChange}
          onValueChange={onFreightInputChange}
        />
        <ReceiptRateioField
          label="Outras despesas"
          mode={nonFiscalOtherExpensesMode}
          value={nonFiscalOtherExpensesInput}
          baseTotal={rateioBaseTotal}
          readOnly={isInvoiceLinkedReceipt && isEditingReceipt}
          colors={colors}
          isDarkMode={isDarkMode}
          onModeChange={onOtherExpensesModeChange}
          onValueChange={onOtherExpensesInputChange}
        />
      </View>
    </View>

    <PurchaseItemsSection
      items={processedItems}
      onOpenProductPicker={onOpenProductPicker}
      onAddItemRow={onOpenProductPicker}
      onUpdateItem={onUpdateItem}
      onRemoveItem={onRemoveItem}
      colors={colors}
      allowAdd={!isInvoiceLinkedReceipt && (isEditingReceipt || origin.kind !== 'invoice')}
      showEmptyAddButton={false}
      allowRemove={!isInvoiceLinkedReceipt && (isEditingReceipt || origin.kind !== 'invoice')}
      addDisabled={!supplierId}
      receiptMode
      simplifiedReceiptMode={origin.kind !== 'invoice'}
      showReceiptCostComposition={!isInvoiceLinkedReceipt}
      readOnly={isInvoiceLinkedReceipt}
    />

    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.text }]}>Observações</Text>
      <FormTextInput
        value={observation}
        onChangeText={onObservationChange}
        multiline
        placeholder="Anote divergências ou detalhes da entrega"
        placeholderTextColor={colors.muted}
        style={[
          styles.observationInput,
          {
            color: colors.text,
            backgroundColor: colors.bg,
            borderColor: colors.border,
          },
        ]}
      />
    </View>

    <ReceiptTotalSummary totalValue={totalValue} isDarkMode={isDarkMode} />
  </ScrollView>
);
