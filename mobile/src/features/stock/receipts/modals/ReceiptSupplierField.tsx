import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Check, LockKeyhole } from 'lucide-react-native';
import { styles } from './newGoodsReceiptModal.styles';

interface Props {
  colors: {
    bg: string;
    border: string;
    muted: string;
    surface: string;
    text: string;
  };
  isInvoiceLinkedReceipt: boolean;
  selectedSupplierName?: string;
  originSupplierName?: string;
  supplierSelected: boolean;
  supplierLocked: boolean;
  showSupplierLockTooltip: boolean;
  supplierLoadError: string;
  buttonDisabled: boolean;
  showLockIcon: boolean;
  showManualLoading: boolean;
  showManualChoose: boolean;
  onSupplierPress: () => void;
}

export const ReceiptSupplierField: React.FC<Props> = ({
  colors,
  isInvoiceLinkedReceipt,
  selectedSupplierName,
  originSupplierName,
  supplierSelected,
  supplierLocked,
  showSupplierLockTooltip,
  supplierLoadError,
  buttonDisabled,
  showLockIcon,
  showManualLoading,
  showManualChoose,
  onSupplierPress,
}) => {
  const supplierName = selectedSupplierName || originSupplierName;

  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>
        Fornecedor{isInvoiceLinkedReceipt ? '' : ' *'}
      </Text>
      <View style={styles.supplierFieldContainer}>
        {isInvoiceLinkedReceipt ? (
          <View
            style={[styles.informationalField, { backgroundColor: colors.bg }]}
            accessibilityRole="text"
            accessibilityLabel={`Fornecedor: ${supplierName || 'Fornecedor'}`}
          >
            <Text style={{ color: colors.text, flex: 1 }}>
              {supplierName || 'Fornecedor'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={onSupplierPress}
            disabled={buttonDisabled}
            style={[
              styles.selectButton,
              {
                backgroundColor: colors.bg,
                borderBottomColor: supplierSelected ? '#059669' : colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={supplierLocked
              ? 'Fornecedor selecionado e bloqueado. Toque para ver como liberar o campo.'
              : supplierName || 'Selecionar fornecedor'}
            accessibilityState={{ expanded: supplierLocked && showSupplierLockTooltip }}
            accessibilityHint={supplierLocked
              ? 'Remova todos os itens do recebimento para trocar o fornecedor.'
              : undefined}
          >
            <Text
              style={{
                color: supplierSelected ? colors.text : colors.muted,
                flex: 1,
              }}
            >
              {supplierName || 'Selecionar fornecedor'}
            </Text>
            {supplierSelected ? (
              <View style={styles.supplierIcons}>
                <Check size={18} color="#059669" />
                {showLockIcon ? <LockKeyhole size={18} color="#d97706" /> : null}
              </View>
            ) : showManualLoading ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : showManualChoose ? (
              <Text style={{ color: '#059669', fontWeight: '900' }}>Escolher</Text>
            ) : null}
          </TouchableOpacity>
        )}
        {!isInvoiceLinkedReceipt && supplierLocked && showSupplierLockTooltip ? (
          <View
            style={[styles.lockedTooltip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="text"
          >
            <Text style={[styles.lockedTooltipText, { color: colors.text }]}>
              Para alterar o fornecedor, remova todos os itens deste recebimento.
            </Text>
          </View>
        ) : null}
      </View>
      {supplierLoadError ? <Text style={styles.errorText}>{supplierLoadError}</Text> : null}
    </>
  );
};
