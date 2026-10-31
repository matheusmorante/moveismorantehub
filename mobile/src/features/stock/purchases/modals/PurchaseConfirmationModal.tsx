import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Trash2 } from 'lucide-react-native';

interface PurchaseConfirmationModalProps {
  visible: boolean;
  isDarkMode: boolean;
  title: string;
  eyebrow: string;
  description: string;
  orderReference: string;
  confirmLabel: string;
  loadingLabel: string;
  tone: 'danger' | 'warning';
  isLoading: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const PurchaseConfirmationModal: React.FC<PurchaseConfirmationModalProps> = ({
  visible,
  isDarkMode,
  title,
  eyebrow,
  description,
  orderReference,
  confirmLabel,
  loadingLabel,
  tone,
  isLoading,
  errorMessage,
  onCancel,
  onConfirm,
}) => {
  const accent = tone === 'danger' ? '#e11d48' : '#d97706';
  const iconBackground = tone === 'danger'
    ? (isDarkMode ? '#4c0519' : '#fff1f2')
    : (isDarkMode ? '#451a03' : '#fffbeb');
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const text = isDarkMode ? '#f8fafc' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';
  const Icon = tone === 'danger' ? Trash2 : AlertTriangle;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar confirmação"
          disabled={isLoading}
          onPress={onCancel}
          style={styles.dismissLayer}
        />
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: surface, borderColor: border }]}
        >
          <View style={[styles.icon, { backgroundColor: iconBackground }]}>
            <Icon size={22} color={accent} />
          </View>
          <Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text>
          <Text style={[styles.title, { color: text }]}>{title}</Text>
          <Text style={[styles.description, { color: muted }]}>{description}</Text>

          <View style={[styles.orderRow, { borderColor: border }]}>
            <Text style={[styles.orderLabel, { color: muted }]}>Pedido</Text>
            <Text style={[styles.orderValue, { color: text }]}>{orderReference}</Text>
          </View>

          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isLoading}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                { borderColor: border, backgroundColor: surface },
                pressed && !isLoading && styles.pressed,
              ]}
            >
              <Text style={[styles.cancelText, { color: text }]}>Voltar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading }}
              disabled={isLoading}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmButton,
                { backgroundColor: accent },
                pressed && !isLoading && styles.pressed,
                isLoading && styles.disabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : tone === 'danger' ? (
                <Trash2 size={16} color="#ffffff" />
              ) : (
                <AlertTriangle size={16} color="#ffffff" />
              )}
              <Text style={styles.confirmText}>{isLoading ? loadingLabel : confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
  },
  dismissLayer: { ...StyleSheet.absoluteFillObject },
  card: {
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginBottom: 14,
  },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontSize: 21, fontWeight: '900', marginTop: 5 },
  description: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  orderRow: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderLabel: { fontSize: 11, fontWeight: '700' },
  orderValue: { fontSize: 13, fontWeight: '900' },
  error: { color: '#e11d48', fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  cancelText: { fontSize: 12, fontWeight: '800' },
  confirmButton: {
    flex: 1.25,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  confirmText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.62 },
});
