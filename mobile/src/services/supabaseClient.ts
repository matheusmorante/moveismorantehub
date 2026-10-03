import { createClient, processLock } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform, type AppStateStatus } from 'react-native';

export const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
export const WEB_URL = 'https://morantehub.vercel.app';
export const NOTIFICATION_SOUND_URL = 'https://morantehub.vercel.app/levelup.mp3';

const authStorage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    ...(Platform.OS !== 'web' ? { lock: processLock } : {}),
    persistSession: true,
    autoRefreshToken: true,
    // Supabase returns OAuth tokens in the URL fragment on web. Native uses
    // the explicit deep-link handler, so automatic URL detection stays off there.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// O navegador gerencia a visibilidade automaticamente; no runtime nativo,
// retome a renovação ao voltar ao app e suspenda-a enquanto estiver em segundo plano.
export const startMobileAuthRefresh = () => {
  if (Platform.OS === 'web') return () => {};
  const updateRefresh = (state: AppStateStatus) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  };
  updateRefresh(AppState.currentState);
  const subscription = AppState.addEventListener('change', updateRefresh);
  return () => {
    subscription.remove();
    void supabase.auth.stopAutoRefresh();
  };
};

export const MASTER_DEFAULT_PROFILE = {
  id: '00000000-0000-0000-0000-000000000000',
  fullName: 'Matheus Morante',
  email: 'matheusmorante002@gmail.com',
  role: 'admin',
  active: true,
};
