import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { supabase } from './supabaseClient';

// Installed builds return through their registered app scheme. Expo Go needs
// its current `exp://.../--/` deep link so the callback returns to the running app.
export const MOBILE_GOOGLE_AUTH_CALLBACK = 'morantehub://auth/callback';

export const getGoogleAuthRedirectUrl = () => {
  if (Platform.OS === 'web' || isRunningInExpoGo()) {
    return Linking.createURL('auth/callback');
  }
  return MOBILE_GOOGLE_AUTH_CALLBACK;
};

type AuthParams = Record<string, string | undefined>;

const parseParams = (url: string): AuthParams => {
  const query = Linking.parse(url).queryParams || {};
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const hash = Object.fromEntries(new URLSearchParams(fragment).entries());

  return { ...hash, ...query } as AuthParams;
};

export const getOAuthError = (url: string): string | null => {
  const params = parseParams(url);
  if (!params.error) return null;
  return params.error_description || params.error;
};

export const completeGoogleSignIn = async (url: string) => {
  const params = parseParams(url);
  const oauthError = getOAuthError(url);
  if (oauthError) throw new Error(oauthError);

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      // The app-level deep-link listener may have already exchanged this code.
      const { data: currentSession } = await supabase.auth.getSession();
      if (currentSession.session) return currentSession.session;
      throw error;
    }
    return data.session;
  }

  if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw error;
    return data.session;
  }

  throw new Error('O Google não retornou uma sessão válida. Tente novamente.');
};
