import type React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './receiptsScreen.styles';

export type ReceiptActionDialogState =
  | { kind: 'confirm'; action: 'discard' | 'reverse' | 'unreverse'; receipt: any }
  | { kind: 'error'; title: string; message: string };

interface Props {
  dialog: ReceiptActionDialogState | null;
  isDarkMode: boolean;
  isActionRunning: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}

export const ReceiptActionDialogModal: React.FC<Props> = ({
  dialog,
  isDarkMode,
  isActionRunning,
  onDismiss,
  onConfirm,
}) => (
  <Modal
    visible={dialog !== null}
    transparent
    animationType="fade"
    onRequestClose={() => {
      if (!isActionRunning) onDismiss();
    }}
  >
    <View style={styles.receiptActionDialogOverlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        disabled={isActionRunning}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Fechar confirmação do recebimento"
      />
      <View
        style={[styles.receiptActionDialogCard, isDarkMode && styles.menuDark]}
        accessibilityViewIsModal
      >
        <Text style={[styles.receiptActionDialogTitle, isDarkMode && styles.textDark]}>
          {dialog?.kind === 'error'
            ? dialog.title
            : dialog?.action === 'discard'
              ? 'Descartar rascunho?'
              : dialog?.action === 'reverse'
                ? 'Estornar recebimento?'
                : 'Desfazer estorno?'}
        </Text>
        <Text style={[styles.receiptActionDialogMessage, isDarkMode && styles.dialogMessageDark]}>
          {dialog?.kind === 'error'
            ? dialog.message
            : dialog?.action === 'discard'
              ? 'O rascunho deste recebimento será apagado.'
              : dialog?.action === 'reverse'
                ? 'O estorno reverte as entradas de estoque deste recebimento.'
                : 'O recebimento será reativado e as entradas voltarão ao estoque.'}
        </Text>
        <View style={styles.receiptActionDialogActions}>
          {dialog?.kind === 'confirm' ? (
            <TouchableOpacity
              style={[styles.receiptActionDialogButton, styles.receiptActionCancel]}
              onPress={onDismiss}
              disabled={isActionRunning}
              accessibilityRole="button"
              accessibilityLabel="Cancelar ação do recebimento"
            >
              <Text style={[styles.receiptActionCancelText, isDarkMode && styles.textDark]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              styles.receiptActionDialogButton,
              dialog?.kind === 'error'
                ? styles.receiptActionPrimary
                : dialog?.action === 'unreverse'
                  ? styles.receiptActionSuccess
                  : styles.receiptActionDanger,
              isActionRunning && styles.receiptActionButtonDisabled,
            ]}
            onPress={() => {
              if (dialog?.kind === 'error') {
                onDismiss();
                return;
              }
              onConfirm();
            }}
            disabled={isActionRunning}
            accessibilityRole="button"
            accessibilityLabel={
              dialog?.kind === 'error'
                ? 'Fechar mensagem'
                : dialog?.action === 'discard'
                  ? 'Confirmar descarte do rascunho'
                  : dialog?.action === 'reverse'
                    ? 'Confirmar estorno do recebimento'
                    : 'Confirmar desfazer estorno'
            }
          >
            {isActionRunning ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.receiptActionConfirmText}>
                {dialog?.kind === 'error'
                  ? 'Fechar'
                  : dialog?.action === 'discard'
                    ? 'Descartar rascunho'
                    : dialog?.action === 'reverse'
                      ? 'Estornar recebimento'
                      : 'Desfazer estorno'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);
