import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../../services/supabaseClient';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export function useMobileLabelSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setError('');
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const sync = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await withTimeout(supabase.auth.getSession(), 15_000, null, 'etiquetas:sessao');
        if (result?.error) throw result.error;
        let current = result?.data.session || null;
        if (current?.expires_at && current.expires_at * 1000 - Date.now() < 90_000) {
          const refreshed = await withTimeout(supabase.auth.refreshSession(), 15_000, null, 'etiquetas:renovar-sessao');
          if (refreshed?.error) throw refreshed.error;
          current = refreshed?.data.session || null;
        }
        if (active) {
          setSession(current);
          setError(current ? '' : 'Entre novamente no aplicativo para abrir as etiquetas.');
        }
      } catch {
        if (active) setError('Não foi possível confirmar sua sessão. Tente novamente.');
      } finally {
        inFlight = false;
      }
    };
    void sync();
    const timer = setInterval(() => void sync(), 60_000);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      if (next?.expires_at && next.expires_at * 1000 - Date.now() < 90_000) return;
      setSession(next);
      setError(next ? '' : 'Entre novamente no aplicativo para abrir as etiquetas.');
    });
    return () => {
      active = false;
      clearInterval(timer);
      appState.remove();
      subscription.unsubscribe();
    };
  }, [attempt]);

  return { session, error, retry };
}
