import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  dismissWebAlert,
  registerWebAlertListener,
  resolveWebAlert,
  type WebAlertEntry,
} from '../../utils/webAlertService';

interface WebAlertHostProps {
  isDarkMode: boolean;
}

export const WebAlertHost: React.FC<WebAlertHostProps> = ({ isDarkMode }) => {
  const [entry, setEntry] = useState<WebAlertEntry | null>(null);
  const colors = isDarkMode
    ? { card: '#0f172a', text: '#f1f5f9', muted: '#94a3b8', cancel: '#1e293b' }
    : { card: '#ffffff', text: '#0f172a', muted: '#64748b', cancel: '#f1f5f9' };

  useEffect(() => registerWebAlertListener(setEntry), []);

  const dismiss = () => {
    if (entry) dismissWebAlert(entry);
  };
  const canDismiss = Boolean(
    entry?.cancelable || entry?.buttons.some((button) => button.style === 'cancel')
  );

  return (
    <Modal
      visible={Boolean(entry)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        {canDismiss ? (
          <Pressable
            accessibilityLabel="Fechar diálogo"
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
          />
        ) : (
          <View pointerEvents="none" style={StyleSheet.absoluteFill} />
        )}
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.card }]}
        >
          <View style={styles.icon}>
            <Text style={styles.iconText}>!</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{entry?.title}</Text>
          {entry?.message ? (
            <Text style={[styles.message, { color: colors.muted }]}>{entry.message}</Text>
          ) : null}
          <View style={[styles.actions, (entry?.buttons.length || 0) > 2 && styles.stackedActions]}>
            {entry?.buttons.map((button, index) => {
              const destructive = button.style === 'destructive';
              const cancel = button.style === 'cancel';
              return (
                <Pressable
                  key={`${entry.id}-${index}`}
                  accessibilityRole="button"
                  onPress={() => resolveWebAlert(entry.id, index)}
                  style={({ pressed }) => [
                    styles.button,
                    (entry.buttons.length || 0) > 2 && styles.stackedButton,
                    cancel
                      ? { backgroundColor: colors.cancel }
                      : destructive
                        ? styles.destructiveButton
                        : styles.primaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      cancel ? { color: colors.muted } : styles.primaryButtonText,
                    ]}
                  >
                    {button.text || 'OK'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    padding: 24,
    borderRadius: 28,
    gap: 14,
    elevation: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#dbeafe',
  },
  iconText: { color: '#2563eb', fontSize: 26, fontWeight: '900' },
  title: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  stackedActions: { flexDirection: 'column' },
  button: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 15,
  },
  stackedButton: { flex: 0 },
  primaryButton: { backgroundColor: '#2563eb' },
  destructiveButton: { backgroundColor: '#dc2626' },
  primaryButtonText: { color: '#ffffff' },
  buttonText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  pressed: { opacity: 0.78 },
});
