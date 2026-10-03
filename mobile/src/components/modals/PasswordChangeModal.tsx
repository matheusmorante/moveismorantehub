import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '../../services/supabaseClient';
import { validatePasswordSetup } from '../../services/authPasswordSetup';
import {
  getPasswordAuthErrorMessage,
  isCurrentPasswordRequired,
  isPasswordReauthenticationRequired,
  requestPasswordChangeReauthentication,
  updateAuthenticatedPassword,
} from '../../services/authPasswordRecovery';

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  email?: string;
  onClose: () => void;
}

export const PasswordChangeModal: React.FC<Props> = ({ visible, isDarkMode, email, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentPasswordRequired, setCurrentPasswordRequired] = useState(false);
  const [reauthCode, setReauthCode] = useState('');
  const [reauthRequired, setReauthRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (visible) return;
    setPassword('');
    setConfirmation('');
    setCurrentPassword('');
    setCurrentPasswordRequired(false);
    setReauthCode('');
    setReauthRequired(false);
    setMessage('');
  }, [visible]);

  const requestReauthCode = async (isResend = false) => {
    try {
      const { error } = await requestPasswordChangeReauthentication(supabase);
      if (error) {
        setMessage(getPasswordAuthErrorMessage(error, 'reauth-send'));
      } else {
        setReauthRequired(true);
        setReauthCode('');
        setMessage(
          isResend
            ? 'Enviamos um novo código de confirmação.'
            : 'Enviamos um código para confirmar sua identidade.'
        );
      }
    } catch {
      setMessage('Não foi possível enviar o código agora. Tente novamente.');
    }
  };

  const submitPassword = async () => {
    const validationError = validatePasswordSetup(password, confirmation);
    if (validationError) {
      setMessage(validationError);
      return;
    }
    if (reauthRequired && !reauthCode.trim()) {
      setMessage('Informe o código enviado para confirmar sua identidade.');
      return;
    }
    if (currentPasswordRequired && !currentPassword) {
      setMessage('Informe sua senha atual para continuar.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const { error } = await updateAuthenticatedPassword(
        supabase,
        password,
        reauthRequired ? reauthCode : undefined,
        currentPasswordRequired ? currentPassword : undefined
      );
      if (error && !reauthRequired && isPasswordReauthenticationRequired(error)) {
        await requestReauthCode();
        return;
      }
      if (error && !currentPasswordRequired && isCurrentPasswordRequired(error)) {
        setCurrentPasswordRequired(true);
        setMessage('Informe sua senha atual para continuar.');
        return;
      }
      if (error) {
        setMessage(
          getPasswordAuthErrorMessage(error, reauthRequired ? 'recovery-verify' : 'password-update')
        );
        return;
      }

      Alert.alert('Senha alterada', 'Sua nova senha já pode ser usada no próximo login.');
      onClose();
    } catch {
      setMessage('Não foi possível atualizar a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, isDarkMode && styles.textLight]}>Alterar senha</Text>
                <Text style={styles.subtitle}>Crie uma senha para sua conta MoranteHub.</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.close}>
                <X size={18} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {email ? <Text style={styles.email}>{email}</Text> : null}
              {message ? (
                <Text
                  accessibilityRole="alert"
                  style={[
                    styles.message,
                    message.includes('Enviamos') ? styles.successMessage : styles.errorMessage,
                  ]}
                >
                  {message}
                </Text>
              ) : null}

              {currentPasswordRequired ? (
                <>
                  <Text style={[styles.label, isDarkMode && styles.labelDark]}>Senha atual</Text>
                  <TextInput
                    accessibilityLabel="Senha atual"
                    autoComplete="current-password"
                    onChangeText={setCurrentPassword}
                    placeholder="Digite sua senha atual"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    secureTextEntry
                    style={[styles.input, isDarkMode && styles.inputDark]}
                    value={currentPassword}
                  />
                </>
              ) : null}

              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Nova senha</Text>
              <TextInput
                accessibilityLabel="Nova senha"
                autoComplete="new-password"
                onChangeText={setPassword}
                placeholder="Pelo menos 8 caracteres"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                secureTextEntry
                style={[styles.input, isDarkMode && styles.inputDark]}
                value={password}
              />

              <Text style={[styles.label, isDarkMode && styles.labelDark]}>Confirmar senha</Text>
              <TextInput
                accessibilityLabel="Confirmar senha"
                autoComplete="new-password"
                onChangeText={setConfirmation}
                onSubmitEditing={() => void submitPassword()}
                placeholder="Digite novamente"
                placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                returnKeyType="done"
                secureTextEntry
                style={[styles.input, isDarkMode && styles.inputDark]}
                value={confirmation}
              />

              {reauthRequired ? (
                <>
                  <Text style={[styles.label, isDarkMode && styles.labelDark]}>
                    Código de confirmação
                  </Text>
                  <TextInput
                    accessibilityLabel="Código de confirmação"
                    autoComplete="one-time-code"
                    keyboardType="number-pad"
                    onChangeText={(value) => setReauthCode(value.replace(/\s/g, ''))}
                    placeholder="Código enviado por e-mail"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    style={[styles.input, isDarkMode && styles.inputDark]}
                    value={reauthCode}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={loading}
                    onPress={() => void requestReauthCode(true)}
                    style={styles.resendButton}
                  >
                    <Text style={styles.resendText}>Reenviar código</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <TouchableOpacity
                accessibilityRole="button"
                disabled={loading}
                onPress={() => void submitPassword()}
                style={[styles.submit, loading && styles.disabled]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {reauthRequired ? 'Confirmar e alterar senha' : 'Salvar nova senha'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  card: {
    maxHeight: '88%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#fff',
    padding: 24,
    paddingBottom: 32,
  },
  cardDark: { backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  textLight: { color: '#f8fafc' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 4 },
  close: { padding: 6 },
  email: { color: '#64748b', fontSize: 12, marginBottom: 12 },
  message: { fontSize: 12, fontWeight: '700', marginBottom: 12 },
  successMessage: { color: '#047857' },
  errorMessage: { color: '#dc2626' },
  label: { color: '#475569', fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 10 },
  labelDark: { color: '#cbd5e1' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  inputDark: { borderColor: '#334155', color: '#f8fafc', backgroundColor: '#1e293b' },
  resendButton: { alignSelf: 'flex-start', paddingVertical: 10 },
  resendText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  submit: {
    minHeight: 52,
    marginTop: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  disabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
