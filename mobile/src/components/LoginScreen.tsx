import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Lock, ShieldAlert } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../services/supabaseClient';
import { completeGoogleSignIn, getGoogleAuthRedirectUrl } from '../services/googleAuth';
import { styles } from './LoginScreen.styles';

interface Props {
  isDarkMode: boolean;
  onLoginSuccess: (session: any) => void;
}

const authSessionTimeout = <T,>(promise: Promise<T>) => Promise.race<T>([
  promise,
  new Promise<T>((_, reject) => setTimeout(() => reject(new Error('O retorno do Google demorou demais. Feche o navegador e tente novamente.')), 30000)),
]);

export const LoginScreen: React.FC<Props> = ({ isDarkMode, onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const redirectUrl = getGoogleAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          // On web Supabase must redirect the current tab so App can exchange the code.
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (Platform.OS === 'web') return;

      if (data?.url) {
        const result = await authSessionTimeout(WebBrowser.openAuthSessionAsync(data.url, redirectUrl));
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
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
            <TouchableOpacity
              onPress={handleGoogleLogin}
              style={[styles.googleBtn, isDarkMode && styles.googleBtnDark]}
            >
              <View style={styles.googleIconWrapper}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </Svg>
              </View>
              <Text style={[styles.googleBtnText, isDarkMode && styles.googleBtnTextDark]}>ENTRAR COM O GOOGLE</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
