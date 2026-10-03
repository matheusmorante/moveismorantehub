import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { Lock, Mail, ShieldAlert } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../services/supabaseClient';
import { completeGoogleSignIn, getGoogleAuthRedirectUrl } from '../services/googleAuth';
import {
  signInWithEmailPassword,
  signInWithGoogle,
  validatePasswordSetup,
} from '../services/authPasswordSetup';
import {
  getPasswordAuthErrorMessage,
  requestPasswordRecoveryCode,
  updateAuthenticatedPassword,
  verifyPasswordRecoveryCode,
} from '../services/authPasswordRecovery';
import { useAuth } from '../contexts/AuthContext';
import { styles } from './LoginScreen.styles';

interface Props {
  isDarkMode: boolean;
  onLoginSuccess: (session: any) => void;
}

const authSessionTimeout = <T,>(promise: Promise<T>) =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error('O retorno do Google demorou demais. Feche o navegador e tente novamente.')
          ),
        30000
      )
    ),
  ]);

export const LoginScreen: React.FC<Props> = ({ isDarkMode, onLoginSuccess }) => {
  const { beginPasswordRecovery, endPasswordRecovery, handleLogout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryStage, setRecoveryStage] = useState<'idle' | 'email' | 'code' | 'password'>(
    'idle'
  );
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  const startRecovery = () => {
    setErrorMsg('');
    setRecoveryMessage(null);
    setRecoveryStage('email');
    beginPasswordRecovery();
  };

  const sendRecoveryCode = async () => {
    const recoveryEmail = email.trim();
    if (!recoveryEmail) {
      setRecoveryMessage({ tone: 'error', text: 'Informe seu e-mail para continuar.' });
      return;
    }

    setRecoveryBusy(true);
    setRecoveryMessage(null);
    try {
      const { error } = await requestPasswordRecoveryCode(supabase, recoveryEmail);
      if (error) {
        setRecoveryMessage({
          tone: 'error',
          text: getPasswordAuthErrorMessage(error, 'recovery-send'),
        });
        return;
      }
      setRecoveryStage('code');
      setRecoveryMessage({
        tone: 'success',
        text: 'Se a conta estiver cadastrada, enviaremos um código para esse e-mail.',
      });
    } catch {
      setRecoveryMessage({
        tone: 'error',
        text: 'Não foi possível enviar o código agora. Tente novamente mais tarde.',
      });
    } finally {
      setRecoveryBusy(false);
    }
  };

  const verifyRecoveryCode = async () => {
    setRecoveryBusy(true);
    setRecoveryMessage(null);
    try {
      const { error } = await verifyPasswordRecoveryCode(supabase, email, recoveryCode);
      if (error) {
        setRecoveryMessage({
          tone: 'error',
          text: getPasswordAuthErrorMessage(error, 'recovery-verify'),
        });
        return;
      }
      setRecoveryCode('');
      setRecoveryStage('password');
    } catch {
      setRecoveryMessage({ tone: 'error', text: 'Código inválido. Confira e tente novamente.' });
    } finally {
      setRecoveryBusy(false);
    }
  };

  const saveNewPassword = async () => {
    const validationError = validatePasswordSetup(newPassword, confirmNewPassword);
    if (validationError) {
      setRecoveryMessage({ tone: 'error', text: validationError });
      return;
    }

    setRecoveryBusy(true);
    setRecoveryMessage(null);
    try {
      const { error } = await updateAuthenticatedPassword(supabase, newPassword);
      if (error) {
        setRecoveryMessage({
          tone: 'error',
          text: getPasswordAuthErrorMessage(error, 'password-update'),
        });
        return;
      }
      await handleLogout();
      endPasswordRecovery();
      Alert.alert('Senha atualizada', 'Agora você pode entrar com sua nova senha.');
    } catch {
      setRecoveryMessage({
        tone: 'error',
        text: 'Não foi possível atualizar a senha. Tente novamente.',
      });
    } finally {
      setRecoveryBusy(false);
    }
  };

  const cancelRecovery = async () => {
    if (recoveryStage === 'password') await handleLogout();
    endPasswordRecovery();
    setRecoveryStage('idle');
    setRecoveryCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setRecoveryMessage(null);
  };

  const handleEmailPasswordLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const { data, error } = await signInWithEmailPassword(supabase, email, password);
      if (error) throw error;
      if (!data.session) throw new Error('Não foi possível iniciar sua sessão. Tente novamente.');
      onLoginSuccess(data.session);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível entrar com e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const redirectUrl = getGoogleAuthRedirectUrl();
      if (__DEV__) console.log('[GoogleLogin] redirectTo:', redirectUrl);
      const { data, error } = await signInWithGoogle(supabase, {
        redirectTo: redirectUrl,
        // On web Supabase must redirect the current tab so App can exchange the code.
        skipBrowserRedirect: Platform.OS !== 'web',
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (Platform.OS === 'web') return;

      if (data?.url) {
        const result = await authSessionTimeout(
          WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        );
        if (result.type === 'success' && result.url) {
          const session = await completeGoogleSignIn(result.url);
          if (!session) throw new Error('Não foi possível obter a sessão do Google.');
          onLoginSuccess(session);
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          setErrorMsg('Login com Google cancelado.');
        } else {
          setErrorMsg('Não foi possível concluir o login com Google.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao conectar com o Google.');
      console.warn('[GoogleLogin] Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  if (recoveryStage !== 'idle') {
    const recoveryTitle =
      recoveryStage === 'email'
        ? 'Recuperar senha'
        : recoveryStage === 'code'
          ? 'Digite o código'
          : 'Crie sua nova senha';

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, isDarkMode && styles.containerDark]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.cardHeader}>
            <View style={styles.logoCircle}>
              <Lock size={32} color="#ffffff" strokeWidth={2} />
            </View>
            <Text style={[styles.title, isDarkMode && styles.textLight]}>{recoveryTitle}</Text>
            <Text style={styles.subtitle}>
              {recoveryStage === 'email'
                ? 'Informe o e-mail da sua conta MoranteHub.'
                : recoveryStage === 'code'
                  ? 'Enviamos um código para o e-mail informado.'
                  : 'Escolha uma senha com pelo menos 8 caracteres.'}
            </Text>
          </View>

          {recoveryMessage ? (
            <View
              style={[
                recoveryMessage.tone === 'error' ? styles.errorAlert : styles.recoverySuccessAlert,
              ]}
            >
              {recoveryMessage.tone === 'error' ? (
                <ShieldAlert size={16} color="#ef4444" style={{ marginRight: 8 }} />
              ) : null}
              <Text
                style={
                  recoveryMessage.tone === 'error' ? styles.errorText : styles.recoverySuccessText
                }
              >
                {recoveryMessage.text}
              </Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {recoveryStage === 'email' ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>E-mail</Text>
                <View style={[styles.inputShell, isDarkMode && styles.inputShellDark]}>
                  <Mail size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  <TextInput
                    accessibilityLabel="E-mail para recuperação"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="seu@email.com"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    style={[styles.credentialInput, isDarkMode && styles.credentialInputDark]}
                    value={email}
                  />
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={recoveryBusy}
                  onPress={() => void sendRecoveryCode()}
                  style={styles.submitBtn}
                >
                  {recoveryBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Enviar código</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : recoveryStage === 'code' ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>
                  Código de recuperação
                </Text>
                <View style={[styles.inputShell, isDarkMode && styles.inputShellDark]}>
                  <ShieldAlert size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                  <TextInput
                    accessibilityLabel="Código de recuperação"
                    autoCapitalize="none"
                    autoComplete="one-time-code"
                    keyboardType="number-pad"
                    onChangeText={(value) => setRecoveryCode(value.replace(/\s/g, ''))}
                    placeholder="Código recebido por e-mail"
                    placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                    style={[styles.credentialInput, isDarkMode && styles.credentialInputDark]}
                    value={recoveryCode}
                  />
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={recoveryBusy || !recoveryCode.trim()}
                  onPress={() => void verifyRecoveryCode()}
                  style={[
                    styles.submitBtn,
                    (recoveryBusy || !recoveryCode.trim()) && styles.submitBtnDisabled,
                  ]}
                >
                  {recoveryBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Validar código</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={recoveryBusy}
                  onPress={() => void sendRecoveryCode()}
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
                    <TextInput
                      accessibilityLabel="Nova senha"
                      autoComplete="new-password"
                      onChangeText={setNewPassword}
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
                    <TextInput
                      accessibilityLabel="Confirmar nova senha"
                      autoComplete="new-password"
                      onChangeText={setConfirmNewPassword}
                      onSubmitEditing={() => void saveNewPassword()}
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
                  disabled={recoveryBusy}
                  onPress={() => void saveNewPassword()}
                  style={[styles.submitBtn, recoveryBusy && styles.submitBtnDisabled]}
                >
                  {recoveryBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Salvar nova senha</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              disabled={recoveryBusy}
              onPress={() => void cancelRecovery()}
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardHeader}>
          <View style={styles.logoCircle}>
            <Lock size={32} color="#ffffff" strokeWidth={2} />
          </View>
          <Text style={[styles.title, isDarkMode && styles.textLight]}>Acesso da Equipe</Text>
          <Text style={styles.subtitle}>Móveis Morante</Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorAlert}>
            <ShieldAlert size={16} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 20 }} />
          ) : (
            <>
              <View style={styles.credentialsForm}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>
                    E-mail
                  </Text>
                  <View style={[styles.inputShell, isDarkMode && styles.inputShellDark]}>
                    <Mail size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <TextInput
                      accessibilityLabel="E-mail"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder="seu@email.com"
                      placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                      style={[styles.credentialInput, isDarkMode && styles.credentialInputDark]}
                      value={email}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, isDarkMode && styles.fieldLabelDark]}>
                    Senha
                  </Text>
                  <View style={[styles.inputShell, isDarkMode && styles.inputShellDark]}>
                    <Lock size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <TextInput
                      accessibilityLabel="Senha"
                      autoComplete="password"
                      onChangeText={setPassword}
                      onSubmitEditing={() => void handleEmailPasswordLogin()}
                      placeholder="Sua senha do MoranteHub"
                      placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
                      returnKeyType="go"
                      secureTextEntry
                      style={[styles.credentialInput, isDarkMode && styles.credentialInputDark]}
                      value={password}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={startRecovery}
                  style={styles.forgotPasswordButton}
                >
                  <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => void handleEmailPasswordLogin()}
                  style={styles.submitBtn}
                >
                  <Text style={styles.submitBtnText}>Entrar</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={[styles.dividerLine, isDarkMode && styles.dividerLineDark]} />
                <Text style={[styles.dividerText, isDarkMode && styles.fieldLabelDark]}>ou</Text>
                <View style={[styles.dividerLine, isDarkMode && styles.dividerLineDark]} />
              </View>

              <TouchableOpacity
                onPress={handleGoogleLogin}
                style={[styles.googleBtn, isDarkMode && styles.googleBtnDark]}
              >
                <View style={styles.googleIconWrapper}>
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <Path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <Path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <Path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </Svg>
                </View>
                <Text style={[styles.googleBtnText, isDarkMode && styles.googleBtnTextDark]}>
                  CONTINUAR COM GOOGLE
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
