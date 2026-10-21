import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

/** Native media elements receive only a temporary local URL, never a session token. */
export function useCustomerSupportMedia(mediaId: string | null) {
  const { user } = useAuth();
  const userId = user?.id;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: '', url: null as string | null, loading: false, error: '' });
  const key = `${userId || ''}:${mediaId || ''}:${attempt}`;

  useEffect(() => {
    if (!mediaId) return;
    if (!userId) {
      setState({ key, url: null, loading: false, error: 'Entre novamente para consultar a mídia.' });
      return;
    }
    const controller = new AbortController();
    let objectUrl: string | null = null;
    let active = true;
    const timer = setTimeout(() => controller.abort(), 30_000);
    setState({ key, url: null, loading: true, error: '' });
    void (async () => {
      try {
        const session = await withTimeout(supabase.auth.getSession(), 10_000, null, 'central:media-session');
        if (!active) return;
        const token = session?.data.session?.access_token;
        if (session?.error || !token) throw new Error('Entre novamente para consultar a mídia.');
        const response = await fetch(`/api/whatsapp-media?id=${encodeURIComponent(mediaId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.error || 'Não foi possível carregar a mídia. Tente novamente.');
        }
        const blob = await response.blob();
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ key, url: objectUrl, loading: false, error: '' });
      } catch (error) {
        if (active) setState({
          key, url: null, loading: false,
          error: controller.signal.aborted ? 'A consulta da mídia demorou demais. Tente novamente.'
            : error instanceof Error ? error.message : 'Não foi possível carregar a mídia.',
        });
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key, mediaId, userId]);

  const current = state.key === key;
  return {
    mediaUrl: current ? state.url : null,
    isLoadingMedia: Boolean(mediaId) && (!current || state.loading),
    mediaError: current ? state.error : '',
    retryMedia: () => setAttempt((value) => value + 1),
  };
}
