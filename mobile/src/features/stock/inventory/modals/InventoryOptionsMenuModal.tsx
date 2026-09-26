import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import type { InventorySession } from '../../types/stock.types';

interface Props {
  visible: boolean;
  session: InventorySession | null;
  isDarkMode: boolean;
  onClose: () => void;
  onContinue: (session: InventorySession) => void;
  onViewDetails: (session: InventorySession) => void;
  onDuplicate: (session: InventorySession) => void;
  onReverse: (session: InventorySession) => void;
  onApplyAdjustments: (session: InventorySession) => void;
  onDeleteDraft: (session: InventorySession) => void;
}

export const InventoryOptionsMenuModal: React.FC<Props> = ({
  visible,
  session,
  isDarkMode,
  onClose,
  onContinue,
  onViewDetails,
  onDuplicate,
  onReverse,
  onApplyAdjustments,
  onDeleteDraft,
}) => {
  if (!visible || !session) return null;

  const adjustmentsCount = session.adjustmentsCount || 0;
  const reversedCount = session.reversedCount || 0;
  const isInProgress = session.status === 'in_progress' || session.status === 'pending_sync';
  const canRevert = session.status === 'completed' && adjustmentsCount > 0 && reversedCount === 0;
  const hasReverted = session.status === 'completed' && reversedCount > 0;
  const code = session.inventoryCode || session.name?.replace('Inventário #', '') || session.id.split('-')[0];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
          <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
            Opções do Inventário #{code}
          </Text>

          {isInProgress ? (
            <TouchableOpacity style={styles.modalOption} onPress={() => onContinue(session)}>
              <Text style={[styles.modalOptionText, { color: '#059669' }]}>{session.status === 'pending_sync' ? 'Retomar envio' : 'Continuar inventário'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.modalOption} onPress={() => onViewDetails(session)}>
              <Text style={[styles.modalOptionText, isDarkMode && styles.modalOptionTextDark]}>Ver detalhes</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.modalOption} onPress={() => onDuplicate(session)}>
            <Text style={[styles.modalOptionText, isDarkMode && styles.modalOptionTextDark]}>Duplicar inventário</Text>
          </TouchableOpacity>

          {canRevert && (
            <TouchableOpacity style={styles.modalOption} onPress={() => onReverse(session)}>
              <Text style={styles.modalOptionTextDestructive}>Desfazer inventário</Text>
            </TouchableOpacity>
          )}

          {hasReverted && (
            <TouchableOpacity style={styles.modalOption} onPress={() => onApplyAdjustments(session)}>
              <Text style={[styles.modalOptionText, { color: '#059669' }]}>Aplicar ajuste</Text>
            </TouchableOpacity>
          )}

          {isInProgress && (
            <TouchableOpacity style={styles.modalOption} onPress={() => onDeleteDraft(session)}>
              <Text style={styles.modalOptionTextDestructive}>Excluir contagem</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.modalDivider, isDarkMode && styles.modalDividerDark]} />

          <TouchableOpacity style={styles.modalOption} onPress={onClose}>
            <Text style={styles.modalOptionTextCancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalContentDark: {
    backgroundColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  modalTitleDark: {
    color: '#f8fafc',
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  modalOptionTextDark: {
    color: '#cbd5e1',
  },
  modalOptionTextDestructive: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e11d48',
  },
  modalOptionTextCancel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  modalDividerDark: {
    backgroundColor: '#334155',
  },
});
