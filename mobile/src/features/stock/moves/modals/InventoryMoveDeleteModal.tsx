import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { RotateCcw, AlertTriangle } from 'lucide-react-native';
import { StockMove } from '../../types/stock.types';
import { isPurchaseEntry } from '../domain/inventoryTimelineBalance';

export interface InventoryMoveDeleteModalProps {
  move: StockMove | null;
  isOpen: boolean;
  isDarkMode: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export const InventoryMoveDeleteModal: React.FC<InventoryMoveDeleteModalProps> = ({
  move,
  isOpen,
  isDarkMode,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');

  const isPurchase = move ? isPurchaseEntry(move) : false;

  useEffect(() => {
    if (move && isOpen) {
      setReason(isPurchase ? 'Estorno de entrada de pedido de compra' : 'Estorno manual de lançamento');
    }
  }, [move, isOpen, isPurchase]);

  if (!isOpen || !move) return null;

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <View style={[styles.iconWrapper, isDarkMode && styles.iconWrapperDark]}>
            <RotateCcw size={22} color={isDarkMode ? '#fbbf24' : '#d97706'} />
          </View>

          <Text style={[styles.title, isDarkMode && styles.textLight]}>
            Estornar movimentação?
          </Text>

          <Text style={[styles.description, isDarkMode && styles.textMuted]}>
            {isPurchase
              ? 'Esta entrada foi gerada a partir de um pedido de compra. Ao estornar, o efeito no saldo de estoque será cancelado e o histórico ficará preservado.'
              : 'A movimentação receberá o status de estornada e não terá mais efeito no saldo do estoque. O registro permanecerá no histórico.'}
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, isDarkMode && styles.labelDark]}>
              Justificativa / Observação *
            </Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark, isDarkMode && styles.textLight]}
              placeholder="Informe a observação do estorno..."
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isDeleting}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, isDarkMode && styles.cancelBtnDark]}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={[styles.cancelText, isDarkMode && styles.textLight]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, (!reason.trim() || isDeleting) && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={isDeleting || !reason.trim()}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <RotateCcw size={14} color="#ffffff" />
                  <Text style={styles.confirmText}>Confirmar estorno</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconWrapperDark: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 16,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
  formGroup: {
    marginBottom: 20,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  labelDark: {
    color: '#94a3b8',
  },
  input: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnDark: {
    backgroundColor: '#334155',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
});
