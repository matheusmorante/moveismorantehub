import { waitForAuthOperation } from '../../../../shared-utils/authOperationTimeout';
import { Lock } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { flattenFormErrors, useZodForm } from '../../hooks/useZodForm';
import { passwordSetupFormSchema } from '../../../../shared-utils/authFormSchemas';

type Props = {
  visible: boolean;
  status: PasswordCredentialStatus;
  email?: string;
  onCreatePassword: (password: string, confirmation: string) => Promise<void>;
  onLogout: () => Promise<void>;
};

export function PasswordSetupModal({ visible, status, email, onCreatePassword, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const form = useZodForm(passwordSetupFormSchema, { password, confirmation });
  const operationInFlight = useRef(false);

  if (!visible || status !== 'required') return null;

  const handleCreatePassword = async () => {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    try {
      await form.validateAndRun({ password, confirmation }, async (validated) => {
        setIsSubmitting(true);
        setMessage('');
        try {
          await waitForAuthOperation(onCreatePassword(validated.password, validated.confirmation), 'criação da senha');
          setPassword('');
          setConfirmation('');
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'Não foi possível criar a senha.');
        } finally {
          setIsSubmitting(false);
        }
      }, (errors) => setMessage(Object.values(flattenFormErrors(errors))[0]));
    } finally { operationInFlight.current = false; }
  };

  const handleLogout = async () => {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setIsSubmitting(true);
    try { await waitForAuthOperation(onLogout(), 'encerramento da sessão'); }
    catch (error: unknown) { setMessage(error instanceof Error ? error.message : 'Não foi possível sair da conta.'); }
    finally { operationInFlight.current = false; setIsSubmitting(false); }
  };

  return (
    <Modal animationType="fade" onRequestClose={() => {}} transparent visible>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.backdrop,
          { paddingTop: 22 + insets.top, paddingBottom: 22 + insets.bottom },
        ]}
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
            onPress={() => void handleLogout()}
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
