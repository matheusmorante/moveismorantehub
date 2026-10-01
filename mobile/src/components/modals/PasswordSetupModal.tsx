import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { PasswordCredentialStatus } from '../../contexts/AuthContext';
import { validatePasswordSetup } from '../../services/authPasswordSetup';

type Props = {
  visible: boolean;
  status: PasswordCredentialStatus;
  email?: string;
  onCreatePassword: (password: string, confirmation: string) => Promise<void>;
  onLogout: () => Promise<void>;
};

export function PasswordSetupModal({ visible, status, email, onCreatePassword, onLogout }: Props) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  if (!visible || status !== 'required') return null;

  const handleCreatePassword = async () => {
    const validationError = validatePasswordSetup(password, confirmation);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      await onCreatePassword(password, confirmation);
      setPassword('');
      setConfirmation('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível criar a senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={() => {}} transparent visible>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.icon}>
            <Lock size={25} color="#2563eb" />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            Crie sua senha de acesso
          </Text>
          <Text style={styles.description}>
            Cadastre uma senha para também poder entrar sem o Google.
          </Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}

          <View style={styles.fields}>
            <TextInput
              accessibilityLabel="Nova senha"
              autoComplete="new-password"
              onChangeText={setPassword}
              placeholder="Nova senha"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <TextInput
              accessibilityLabel="Confirmar senha"
              autoComplete="new-password"
              onChangeText={setConfirmation}
              onSubmitEditing={() => void handleCreatePassword()}
              placeholder="Confirmar senha"
              placeholderTextColor="#94a3b8"
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              value={confirmation}
            />
            <Text style={styles.hint}>Use pelo menos 8 caracteres.</Text>
          </View>

          {message ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {message}
            </Text>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => void handleCreatePassword()}
            style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Criar senha</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void onLogout()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 26,
    backgroundColor: '#ffffff',
    padding: 26,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 16,
  },
  icon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#eff6ff',
    marginBottom: 18,
  },
  title: { color: '#0f172a', fontSize: 21, fontWeight: '900', letterSpacing: -0.3 },
  description: { color: '#475569', fontSize: 14, lineHeight: 21, marginTop: 8 },
  email: {
    color: '#334155',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    overflow: 'hidden',
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  fields: { gap: 11, marginTop: 20 },
  input: {
    minHeight: 52,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 14,
    color: '#0f172a',
    fontSize: 15,
    paddingHorizontal: 15,
  },
  hint: { color: '#64748b', fontSize: 12, marginLeft: 3 },
  error: { color: '#dc2626', fontSize: 13, fontWeight: '600', marginTop: 12 },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 15,
    marginTop: 22,
  },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 13 },
  secondaryButtonText: { color: '#475569', fontSize: 13, fontWeight: '700' },
});
