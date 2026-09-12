import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Radio, Play, X, Shield } from 'lucide-react-native';

interface Props {
  visible: boolean;
  orderNumber?: string;
  customerName?: string;
  loading?: boolean;
  isDarkMode?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeliveryStartConfirmModal: React.FC<Props> = ({
  visible,
  orderNumber,
  customerName,
  loading = false,
  isDarkMode = false,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={loading ? undefined : onCancel} />

        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          {/* Botão de Fechar */}
          <TouchableOpacity
            style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}
            onPress={onCancel}
            disabled={loading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>

          {/* Ícone de Destaque */}
          <View style={[styles.iconCircle, isDarkMode && styles.iconCircleDark]}>
            <Radio size={28} color="#2563eb" />
          </View>

          {/* Título & Identificação */}
          <Text style={[styles.title, isDarkMode && styles.textLight]}>
            Iniciar Entrega
          </Text>

          {orderNumber ? (
            <Text style={[styles.orderSubtitle, isDarkMode && styles.textMuted]}>
              {orderNumber} {customerName ? `• ${customerName}` : ''}
            </Text>
          ) : null}

          {/* Box Informativo de Privacidade e Compartilhamento */}
          <View style={[styles.noticeBox, isDarkMode && styles.noticeBoxDark]}>
            <View style={styles.noticeHeader}>
              <Shield size={16} color="#2563eb" />
              <Text style={[styles.noticeTitle, isDarkMode && styles.noticeTitleDark]}>
                Compartilhamento de Localização
              </Text>
            </View>
            <Text style={[styles.noticeText, isDarkMode && styles.noticeTextDark]}>
              Ao iniciar a entrega, a sua posição em tempo real ficará visível no mapa para os outros membros da equipe até que todas as etapas deste pedido sejam finalizadas.
            </Text>
          </View>

          {/* Ações */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.confirmBtn, loading && styles.btnDisabled]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Play size={16} color="#ffffff" fill="#ffffff" />
                  <Text style={styles.confirmBtnText}>Iniciar e Compartilhar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, isDarkMode && styles.cancelBtnDark]}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelBtnText, isDarkMode && styles.cancelBtnTextDark]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    position: 'relative',
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#334155',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  iconCircleDark: {
    backgroundColor: '#1e3a5f',
    borderColor: '#2563eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  orderSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
    marginBottom: 14,
    textAlign: 'center',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
  noticeBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
  },
  noticeBoxDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  noticeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1e40af',
  },
  noticeTitleDark: {
    color: '#60a5fa',
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: '#475569',
  },
  noticeTextDark: {
    color: '#cbd5e1',
  },
  actionsContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 8,
  },
  confirmBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  cancelBtn: {
    width: '100%',
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelBtnDark: {
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtnTextDark: {
    color: '#94a3b8',
  },
});
