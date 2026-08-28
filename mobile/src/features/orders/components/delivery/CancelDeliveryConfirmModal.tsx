import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  isDarkMode?: boolean;
  orderNumber: string;
}

export const CancelDeliveryConfirmModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
  loading,
  isDarkMode,
  orderNumber,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.modalCard, isDarkMode && styles.modalCardDark]}
          onStartShouldSetResponder={() => true}
        >
          {/* Topo com Ícone de Alerta */}
          <View style={styles.topRow}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={24} color="#ef4444" />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={loading}>
              <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, isDarkMode && styles.textLight]}>
            Cancelar Entrega
          </Text>

          <Text style={styles.description}>
            Deseja realmente cancelar o processo de entrega do pedido <Text style={{ fontWeight: '900', color: '#0f172a' }}>#{orderNumber}</Text>? O status do pedido retornará para <Text style={{ fontWeight: '900', color: '#2563eb' }}>Agendado</Text>.
          </Text>

          {/* Botões de Ação */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={[styles.cancelBtn, isDarkMode && styles.cancelBtnDark]}
            >
              <Text style={[styles.cancelBtnText, isDarkMode && styles.textLight]}>Voltar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              style={styles.confirmBtn}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmBtnText}>Sim, Cancelar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    gap: 14,
  },
  modalCardDark: {
    backgroundColor: '#1e293b',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  textLight: {
    color: '#f8fafc',
  },
  description: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnDark: {
    backgroundColor: '#334155',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
});
