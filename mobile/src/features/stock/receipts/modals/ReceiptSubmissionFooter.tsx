import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './newGoodsReceiptModal.styles';

interface ReceiptSubmissionFooterProps {
  colors: { surface: string; border: string; muted: string };
  saving: boolean;
  resumeSourceLoading: boolean;
  resumeSourceError: string;
  hasIncompleteItems: boolean;
  isEditingReceipt: boolean;
  onCancel: () => Promise<void>;
  onConfirm: () => void;
}

export const ReceiptSubmissionFooter: React.FC<ReceiptSubmissionFooterProps> = ({
  colors,
  saving,
  resumeSourceLoading,
  resumeSourceError,
  hasIncompleteItems,
  isEditingReceipt,
  onCancel,
  onConfirm,
}) => (
  <View
    style={[
      styles.footer,
      { backgroundColor: colors.surface, borderColor: colors.border },
    ]}
  >
    <TouchableOpacity
      onPress={onCancel}
      disabled={saving}
      style={[styles.cancelButton, { borderColor: colors.border }]}
    >
      <Text style={{ color: colors.muted, fontWeight: '800' }}>Cancelar</Text>
    </TouchableOpacity>
    <TouchableOpacity
      onPress={onConfirm}
      disabled={saving || resumeSourceLoading || Boolean(resumeSourceError) || hasIncompleteItems}
      style={[styles.confirmButton, (resumeSourceLoading || resumeSourceError || hasIncompleteItems) && styles.confirmButtonDisabled]}
    >
      {saving || resumeSourceLoading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={styles.confirmText}>{isEditingReceipt ? 'Salvar alteração' : 'Confirmar recebimento'}</Text>
      )}
    </TouchableOpacity>
  </View>
);
