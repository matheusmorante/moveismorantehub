import * as Linking from 'expo-linking';
import { supabase } from './supabaseClient';

// In Expo Go this is the active exp:// URL; in installed builds it is morantehub://auth/callback.
// Both patterns must be registered in Supabase Authentication > URL Configuration.
export const getGoogleAuthRedirectUrl = () => Linking.createURL('auth/callback');

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
