import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pencil, Trash2, X } from 'lucide-react-native';
import { deleteFinancialTransaction, FinancialTransaction } from '../../../services/mobileFinanceService';

interface Props {
  visible: boolean;
  transaction: FinancialTransaction | null;
  isDarkMode?: boolean;
  onClose: () => void;
  onEdit: (transaction: FinancialTransaction) => void;
  onDeleted: () => void;
}

export const TransactionActionsModal: React.FC<Props> = ({
  visible,
  transaction,
  isDarkMode = false,
  onClose,
  onEdit,
  onDeleted,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(3);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setConfirmingDelete(false);
      setSecondsRemaining(3);
      setDeleting(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!confirmingDelete || secondsRemaining <= 0) return;
    const timer = setTimeout(() => setSecondsRemaining(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [confirmingDelete, secondsRemaining]);

  if (!transaction) return null;

  const handleDelete = async () => {
    if (secondsRemaining > 0 || deleting) return;
    setDeleting(true);
    const result = await deleteFinancialTransaction(transaction.id);
    setDeleting(false);

    if (!result.success) {
      Alert.alert('Erro ao excluir', result.error || 'Não foi possível excluir a transação.');
      return;
    }

    onDeleted();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.content, isDarkMode && styles.contentDark]} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, isDarkMode && styles.textDark]}>
                {confirmingDelete ? 'Excluir transação?' : 'Ações da transação'}
              </Text>
              <Text style={[styles.description, isDarkMode && styles.mutedDark]} numberOfLines={2}>
                {transaction.description}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          {confirmingDelete ? (
            <>
              <Text style={[styles.warning, isDarkMode && styles.mutedDark]}>
                Esta ação remove a movimentação definitivamente e atualiza os totais do período.
              </Text>
              <View style={styles.confirmRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setConfirmingDelete(false)} disabled={deleting}>
                  <Text style={styles.cancelText}>Não, voltar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmDeleteButton, secondsRemaining > 0 && styles.disabledDeleteButton]}
                  onPress={handleDelete}
                  disabled={secondsRemaining > 0 || deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.confirmDeleteText}>
                      {secondsRemaining > 0 ? `Sim, excluir (${secondsRemaining}s)` : 'Sim, excluir'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(transaction)}>
                <Pencil size={18} color="#2563eb" />
                <Text style={styles.editText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteAction]}
                onPress={() => {
                  setSecondsRemaining(3);
                  setConfirmingDelete(true);
                }}
              >
                <Trash2 size={18} color="#dc2626" />
                <Text style={styles.deleteText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.55)' },
  content: { backgroundColor: '#ffffff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  contentDark: { backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  headerText: { flex: 1, paddingRight: 12 },
  title: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  description: { color: '#64748b', fontSize: 13, marginTop: 4 },
  textDark: { color: '#f8fafc' },
  mutedDark: { color: '#94a3b8' },
  closeButton: { padding: 4 },
  actions: { gap: 10 },
  actionButton: { minHeight: 48, borderRadius: 12, backgroundColor: '#eff6ff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deleteAction: { backgroundColor: '#fff1f2' },
  editText: { color: '#2563eb', fontSize: 14, fontWeight: '800' },
  deleteText: { color: '#dc2626', fontSize: 14, fontWeight: '800' },
  warning: { color: '#475569', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  cancelButton: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  confirmDeleteButton: { flex: 1.4, minHeight: 46, borderRadius: 12, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
  disabledDeleteButton: { backgroundColor: '#fca5a5' },
  confirmDeleteText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});
