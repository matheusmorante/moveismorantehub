import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { File, Paths } from 'expo-file-system';
import { WEB_URL } from '../../../services/supabaseClient';
import { buildMobileLabelsUrl, isTrustedMobileLabelsUrl, type MobileLabelRequest } from './labelNavigation';
import { useMobileLabelSession } from './useMobileLabelSession';
import { parseNativeLabelAction } from './labelNativeAction';

async function loadPrint() {
  try { return await import('expo-print'); }
  catch { throw new Error('A impressão não está disponível nesta versão do aplicativo.'); }
}

export function MobileLabelsSurfaceNative({ request }: { request: MobileLabelRequest }) {
  const uri = useMemo(() => buildMobileLabelsUrl(WEB_URL, request), [request]);
  const webView = useRef<WebView>(null);
  const currentUrl = useRef(uri);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { session, error: sessionError, retry: retrySession } = useMobileLabelSession();

  const sendResult = useCallback((id: string, ok: boolean, error?: string) => {
    if (!isTrustedMobileLabelsUrl(currentUrl.current, WEB_URL)) return;
    const detail = JSON.stringify({ id, ok, ...(error ? { error } : {}) });
    webView.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('morante-label-action-result',{detail:${detail}}));true;`);
  }, []);

  useEffect(() => {
    if (!ready || !session || !isTrustedMobileLabelsUrl(currentUrl.current, WEB_URL)) return;
    const payload = JSON.stringify({
      type: 'morante-label-session',
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      userId: session.user.id,
    });
    webView.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('morante-label-session',{detail:${payload}}));true;`);
  }, [ready, session?.access_token, session?.refresh_token, session?.user.id]);

  useEffect(() => {
    if (ready || loadError) return;
    const timer = setTimeout(() => setLoadError('Não foi possível carregar as etiquetas. Tente novamente.'), 20_000);
    return () => clearTimeout(timer);
  }, [ready, loadError, reloadKey]);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    if (!isTrustedMobileLabelsUrl(event.nativeEvent.url, WEB_URL)) return;
    let raw: unknown;
    try { raw = JSON.parse(event.nativeEvent.data); } catch { return; }
    if (raw && typeof raw === 'object' && (raw as { type?: unknown }).type === 'morante-label-ready') {
      currentUrl.current = event.nativeEvent.url;
      setLoadError('');
      setReady(true);
      return;
    }
    const message = parseNativeLabelAction(raw);
    if (!message) {
      const candidate = raw as { type?: unknown; id?: unknown } | null;
      if (candidate?.type === 'morante-label-action' && typeof candidate.id === 'string' && /^[a-z0-9-]{1,64}$/i.test(candidate.id)) {
        sendResult(candidate.id, false, 'Não foi possível preparar a ação.');
      }
      return;
    }
    if (busy.current) {
      sendResult(message.id, false, 'Aguarde a ação anterior terminar.');
      return;
    }
    busy.current = true;
    try {
      if (message.action === 'check-print') {
        const print = await loadPrint();
        if (typeof print.printAsync !== 'function') throw new Error('A impressão não está disponível nesta versão do aplicativo.');
      } else if (message.action === 'print') {
        const print = await loadPrint();
        await print.printAsync({ html: message.html, width: message.width, height: message.height, margins: { top: 0, right: 0, bottom: 0, left: 0 } });
      } else if (message.action === 'share-image' || message.action === 'copy-image') {
        if (message.action === 'copy-image') {
          const clipboard = await import('expo-clipboard');
          await clipboard.setImageAsync(message.base64);
        } else {
          const sharing = await import('expo-sharing');
          if (!await sharing.isAvailableAsync()) throw new Error('O compartilhamento não está disponível neste aparelho.');
          const safeName = message.fileName.replace(/[^a-z0-9._-]/gi, '_').slice(0, 100);
          const file = new File(Paths.cache, `${Date.now()}-${safeName}`);
          file.write(message.base64, { encoding: 'base64' });
          await sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png' });
        }
      } else {
        return;
      }
      sendResult(message.id, true);
    } catch (error) {
      sendResult(message.id, false, error instanceof Error ? error.message : 'Não foi possível concluir a ação.');
    } finally {
      busy.current = false;
    }
  }, [sendResult]);

  const retry = () => {
    retrySession();
    setReady(false);
    setLoadError('');
    currentUrl.current = uri;
    setReloadKey((value) => value + 1);
  };

  return (
    <View style={styles.container}>
      <WebView
        key={reloadKey}
        ref={webView}
        source={{ uri }}
        style={styles.container}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={(next) => {
          if (next.url === 'about:blank') return true;
          const allowed = isTrustedMobileLabelsUrl(next.url, WEB_URL);
          if (allowed) currentUrl.current = next.url;
          return allowed;
        }}
        onLoadStart={() => setReady(false)}
        onError={() => setLoadError('Não foi possível carregar as etiquetas. Tente novamente.')}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 400 && isTrustedMobileLabelsUrl(event.nativeEvent.url, WEB_URL)) {
            setLoadError('Não foi possível carregar as etiquetas. Tente novamente.');
          }
        }}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        originWhitelist={[new URL(WEB_URL).origin]}
      />
      {(!ready || loadError || sessionError) && (
        <View style={styles.overlay}>
          {loadError || sessionError ? (
            <>
              <Text style={styles.message} accessibilityRole="alert">{sessionError || loadError}</Text>
              <TouchableOpacity onPress={retry} accessibilityRole="button"><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity>
            </>
          ) : <><ActivityIndicator color="#2563eb" /><Text style={styles.message}>Carregando etiquetas…</Text></>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  message: { textAlign: 'center', color: '#475569', fontSize: 14 },
  retry: { color: '#2563eb', fontWeight: '700', padding: 10 },
});
