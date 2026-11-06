import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Pencil, Play, Printer, RotateCcw, Trash2 } from 'lucide-react-native';
import { styles } from './receiptsScreen.styles';

interface ReceiptActionsMenuProps {
  receipt: any | null;
  isDarkMode: boolean;
  isDraft: boolean;
  canPrintLabels: boolean;
  printHint?: string;
  isReceiptActionRunning: boolean;
  unreverseBlocked: boolean;
  unreverseReason: string;
  onClose: () => void;
  onPrintLabels: () => void;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
  onEditReceived: () => void;
  onExplainEditBlocked: () => void;
  onReverse: () => void;
  onUnreverse: () => void;
}

export const ReceiptActionsMenu: React.FC<ReceiptActionsMenuProps> = ({
  receipt,
  isDarkMode,
  isDraft,
  canPrintLabels,
  printHint,
  isReceiptActionRunning,
  unreverseBlocked,
  unreverseReason,
  onClose,
  onPrintLabels,
  onResumeDraft,
  onDiscardDraft,
  onEditReceived,
  onExplainEditBlocked,
  onReverse,
  onUnreverse,
}) => (
  <Modal
    visible={Boolean(receipt)}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.receiptMenuOverlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar opções do recebimento"
      />
      <View style={[styles.receiptMenuCard, isDarkMode && styles.menuDark]}>
        <Text style={[styles.receiptMenuTitle, isDarkMode && styles.textDark]}>
          Ações do recebimento
        </Text>
        {receipt?.status === 'received' && !isDraft ? (
          <TouchableOpacity
            style={[styles.menuItem, !canPrintLabels && { opacity: 0.5 }]}
            onPress={onPrintLabels}
            disabled={!canPrintLabels}
            accessibilityRole="button"
            accessibilityLabel="Imprimir etiquetas de identificação"
            accessibilityState={{ disabled: !canPrintLabels }}
            accessibilityHint={canPrintLabels ? undefined : printHint}
          >
            <Printer size={17} color={canPrintLabels ? '#2563eb' : '#64748b'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, isDarkMode && styles.textDark]}>Imprimir etiquetas de identificação</Text>
              {!canPrintLabels && printHint ? (
                <Text style={[styles.receiptMenuHint, isDarkMode && styles.receiptMenuHintDark]}>
                  {printHint}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ) : null}
        {isDraft ? (
          <>
            <TouchableOpacity
              style={[styles.menuItem, styles.resumeMenuItem]}
              onPress={onResumeDraft}
              accessibilityRole="button"
              accessibilityLabel="Retomar cadastramento"
            >
              <Play size={17} color="#2563eb" />
              <Text style={[styles.menuText, isDarkMode && styles.textDark]}>Retomar cadastramento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={onDiscardDraft}
              disabled={isReceiptActionRunning}
              accessibilityRole="button"
              accessibilityLabel="Descartar rascunho"
            >
              <Trash2 size={17} color="#dc2626" />
              <Text style={[styles.menuText, styles.dangerMenuText]}>Descartar rascunho</Text>
            </TouchableOpacity>
          </>
        ) : receipt?.status === 'received' ? (
          <>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={onEditReceived}
              accessibilityRole="button"
              accessibilityLabel="Alterar recebimento"
            >
              <Pencil size={17} color="#2563eb" />
              <Text style={[styles.menuText, isDarkMode && styles.textDark]}>Alterar recebimento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={onReverse}
              disabled={isReceiptActionRunning}
              accessibilityRole="button"
              accessibilityLabel="Estornar recebimento"
            >
              <RotateCcw size={17} color="#dc2626" />
              <Text style={[styles.menuText, styles.dangerMenuText]}>Estornar recebimento</Text>
            </TouchableOpacity>
          </>
        ) : receipt?.status === 'estornado' ? (
          <>
            <TouchableOpacity
              style={[styles.menuItem, { opacity: 0.5 }]}
              onPress={onExplainEditBlocked}
              accessibilityRole="button"
              accessibilityLabel="Alterar recebimento"
              accessibilityHint="Exibe por que a alteração está indisponível enquanto o recebimento está estornado."
            >
              <Pencil size={17} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              <Text style={[styles.menuText, isDarkMode && styles.textDark]}>Alterar recebimento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, unreverseBlocked && { opacity: 0.5 }]}
              onPress={onUnreverse}
              disabled={isReceiptActionRunning || unreverseBlocked}
              accessibilityRole="button"
              accessibilityLabel="Desfazer estorno"
              accessibilityState={{ disabled: isReceiptActionRunning || unreverseBlocked }}
              accessibilityHint={unreverseBlocked ? unreverseReason : undefined}
            >
              <RotateCcw size={17} color="#059669" />
              <Text style={[styles.menuText, styles.successMenuText]}>Desfazer estorno</Text>
            </TouchableOpacity>
            {unreverseBlocked && <Text style={{ color: isDarkMode ? '#cbd5e1' : '#64748b', fontSize: 12, paddingHorizontal: 14, paddingBottom: 8 }}>{unreverseReason}</Text>}
          </>
        ) : null}
      </View>
    </View>
  </Modal>
);
