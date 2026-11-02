import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WEB_URL } from '../../../services/supabaseClient';
import { buildMobileLabelsUrl, type MobileLabelRequest } from './labelNavigation';
import { useMobileLabelSession } from './useMobileLabelSession';

const getLabelsBaseUrl = () => {
  if (__DEV__ && typeof window !== 'undefined' &&
      ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.hostname}:5173`;
  }
  return WEB_URL;
};

export function MobileLabelsSurfaceWeb({ request }: { request: MobileLabelRequest }) {
  const baseUrl = getLabelsBaseUrl();
  const origin = new URL(baseUrl).origin;
  const uri = useMemo(() => buildMobileLabelsUrl(baseUrl, request), [baseUrl, request]);
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { session, error: sessionError, retry: retrySession } = useMobileLabelSession();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === origin && event.source === frame.current?.contentWindow &&
          event.data?.type === 'morante-label-ready') {
        setLoadError('');
        setReady(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [origin]);

  useEffect(() => {
    if (!ready || !session) return;
    frame.current?.contentWindow?.postMessage({
      type: 'morante-label-session',
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      userId: session.user.id,
    }, origin);
  }, [ready, session?.access_token, session?.refresh_token, session?.user.id, origin]);

  useEffect(() => {
    if (ready || loadError) return;
    const timer = window.setTimeout(() => setLoadError('Não foi possível carregar as etiquetas. Tente novamente.'), 20_000);
    return () => window.clearTimeout(timer);
  }, [ready, loadError, reloadKey]);

  return (
    <div style={styles.container}>
      <iframe
        key={reloadKey}
        ref={frame}
        src={uri}
        title="Gerador de etiquetas"
        allow="clipboard-write"
        style={{ width: '100%', height: '100%', border: 0 }}
      />
      {(!ready || loadError || sessionError) && (
        <div style={styles.overlay}>
          {loadError || sessionError ? (
            <>
              <p role="alert" style={styles.message}>{sessionError || loadError}</p>
              <button type="button" style={styles.retry} onClick={() => { retrySession(); setReady(false); setLoadError(''); setReloadKey((value) => value + 1); }}>Tentar novamente</button>
            </>
          ) : <p role="status" style={styles.message}>Carregando etiquetas…</p>}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { position: 'relative', display: 'flex', flex: 1, minHeight: 0 },
  overlay: { position: 'absolute', inset: 0, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  message: { margin: 0, textAlign: 'center', color: '#475569', fontSize: 14 },
  retry: { border: 0, background: 'transparent', color: '#2563eb', fontWeight: 700, padding: 10, cursor: 'pointer' },
};
