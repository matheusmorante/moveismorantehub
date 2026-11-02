import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FormTextInput } from './shared/FormTextInput';
import { Lock, Mail, ShieldAlert } from 'lucide-react-native';
import { styles } from './LoginScreen.styles';

export type PasswordRecoveryStage = 'idle' | 'email' | 'code' | 'password';

export interface PasswordRecoveryMessage {
  tone: 'success' | 'error';
  text: string;
}

interface Props {
  stage: Exclude<PasswordRecoveryStage, 'idle'>;
  email: string;
  recoveryCode: string;
  newPassword: string;
  confirmNewPassword: string;
  busy: boolean;
  message: PasswordRecoveryMessage | null;
  isDarkMode: boolean;
  topInset: number;
  bottomInset: number;
  onEmailChange: (value: string) => void;
  onRecoveryCodeChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmNewPasswordChange: (value: string) => void;
  onSendCode: () => void;
  onVerifyCode: () => void;
  onSaveNewPassword: () => void;
  onCancel: () => void;
}

export function PasswordRecoveryScreen({
  stage,
  email,
  recoveryCode,
  newPassword,
  confirmNewPassword,
  busy,
  message,
  isDarkMode,
  topInset,
  bottomInset,
  onEmailChange,
  onRecoveryCodeChange,
  onNewPasswordChange,
  onConfirmNewPasswordChange,
  onSendCode,
  onVerifyCode,
  onSaveNewPassword,
  onCancel,
}: Props) {
  const recoveryTitle =
    stage === 'email'
      ? 'Recuperar senha'
      : stage === 'code'
        ? 'Digite o código'
        : 'Crie sua nova senha';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: 40 + topInset, paddingBottom: 40 + bottomInset },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardHeader}>
          <View style={styles.logoCircle}>
            <Lock size={32} color="#ffffff" strokeWidth={2} />
          </View>
          <Text style={[styles.title, isDarkMode && styles.textLight]}>{recoveryTitle}</Text>
          <Text style={styles.subtitle}>
            {stage === 'email'
              ? 'Informe o e-mail da sua conta MoranteHub.'
              : stage === 'code'
                ? 'Enviamos um código para o e-mail informado.'
                : 'Escolha uma senha com pelo menos 8 caracteres.'}
          </Text>
        </View>

        {message ? (
          <View style={[message.tone === 'error' ? styles.errorAlert : styles.recoverySuccessAlert]}>
            {message.tone === 'error' ? (
              <ShieldAlert size={16} color="#ef4444" style={{ marginRight: 8 }} />
            ) : null}
            <Text style={message.tone === 'error' ? styles.errorText : styles.recoverySuccessText}>
              {message.text}
            </Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {stage === 'email' ? (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>E-mail</Text>
              <View style={[styles.inputShell, isDarkMode && styles.inputShellDark]}>
                <Mail size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                <FormTextInput
                  accessibilityLabel="E-mail para recuperação"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={onEmailChange}
                  placeholder="seu@email.com"
                  placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                  style={[styles.credentialInput, isDarkMode && styles.credentialInputDark]}
                  value={email}
                />
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void onSendCode()}
                style={styles.submitBtn}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Enviar código</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : stage === 'code' ? (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>
                Código de recuperação
              </Text>
              <View style={[styles.inputShell, isDarkMode && styles.inputShellDark]}>
                <ShieldAlert size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                <FormTextInput
                  accessibilityLabel="Código de recuperação"
                  autoCapitalize="none"
                  autoComplete="one-time-code"
                  keyboardType="number-pad"
                  onChangeText={(value) => onRecoveryCodeChange(value.replace(/\s/g, ''))}
                  placeholder="Código recebido por e-mail"
                  placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                  style={[styles.credentialInput, isDarkMode && styles.credentialInputDark]}
                  value={recoveryCode}
                />
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy || !recoveryCode.trim()}
                onPress={() => void onVerifyCode()}
                style={[
                  styles.submitBtn,
                  (busy || !recoveryCode.trim()) && styles.submitBtnDisabled,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Validar código</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void onSendCode()}
                style={styles.recoverySecondaryButton}
              >
                <Text style={styles.recoverySecondaryText}>Reenviar código</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.credentialsForm}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>
                  Nova senha
                </Text>
                <View style={[styles.inputShell, isDarkMode && styles.inputShellDark]}>
                  <Lock size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  <FormTextInput
                    accessibilityLabel="Nova senha"
                    autoComplete="new-password"
                    onChangeText={onNewPasswordChange}
                    placeholder="Pelo menos 8 caracteres"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    secureTextEntry
                    style={[styles.credentialInput, isDarkMode && styles.credentialInputDark]}
                    value={newPassword}
                  />
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>
                  Confirmar nova senha
                </Text>
                <View style={[styles.inputShell, isDarkMode && styles.inputShellDark]}>
                  <Lock size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  <FormTextInput
                    accessibilityLabel="Confirmar nova senha"
                    autoComplete="new-password"
                    onChangeText={onConfirmNewPasswordChange}
                    onSubmitEditing={() => void onSaveNewPassword()}
                    placeholder="Digite novamente"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    returnKeyType="done"
                    secureTextEntry
                    style={[styles.credentialInput, isDarkMode && styles.credentialInputDark]}
                    value={confirmNewPassword}
                  />
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void onSaveNewPassword()}
                style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Salvar nova senha</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void onCancel()}
            style={styles.recoverySecondaryButton}
          >
            <Text style={[styles.recoverySecondaryText, isDarkMode && styles.fieldLabelDark]}>
              Voltar ao login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
