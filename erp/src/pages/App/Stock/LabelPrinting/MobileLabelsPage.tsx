import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { getProfileRoles } from '../../../utils/accessRoles';
import { canPerform } from '../../../utils/permissionService';
import { subscribeToSettings } from '../../../utils/settingsService';
import { supabase } from '../../../utils/supabaseConfig';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import LabelPrinting from './Index';

type SessionMessage = {
  type: 'morante-label-session';
  accessToken: string;
  refreshToken: string;
  userId: string;
};

type NativeWindow = Window & {
  ReactNativeWebView?: { postMessage: (message: string) => void };
};

const isSessionMessage = (value: unknown): value is SessionMessage => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SessionMessage>;
  return candidate.type === 'morante-label-session' &&
    typeof candidate.accessToken === 'string' && candidate.accessToken.length > 0 &&
    typeof candidate.refreshToken === 'string' && candidate.refreshToken.length > 0 &&
    typeof candidate.userId === 'string' && candidate.userId.length > 0;
};

const isTrustedParentOrigin = (origin: string) => {
  if (origin === window.location.origin) return true;
  return import.meta.env.DEV && ['http://localhost:8081', 'http://127.0.0.1:8081'].includes(origin);
};

export default function MobileLabelsPage() {
  const { user, profile, loading, isPending } = useAuth();
  const [params] = useSearchParams();
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [profileError, setProfileError] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [permissionRevision, setPermissionRevision] = useState(0);
  const [, refreshPermissions] = useState(0);
  const pendingSession = useRef<{ message: SessionMessage; revision: number } | null>(null);
  const sessionRevision = useRef(0);
  const verifiedUserIdRef = useRef<string | null>(null);
  const sessionInFlight = useRef(false);
  const active = useRef(true);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const applyPendingSession = useCallback(async () => {
    if (loadingRef.current || sessionInFlight.current || !pendingSession.current) return;
    const incoming = pendingSession.current;
    pendingSession.current = null;
    sessionInFlight.current = true;
    try {
      const result = await withTimeout(supabase.auth.setSession({
        access_token: incoming.message.accessToken,
        refresh_token: incoming.message.refreshToken,
      }), 15_000, null, 'etiquetas:receber-sessao');
      if (!result || result.error || !result.data.session) throw new Error('Sessão indisponível.');
      const verified = await withTimeout(
        supabase.auth.getUser(result.data.session.access_token), 15_000, null, 'etiquetas:validar-sessao'
      );
      if (!verified || verified.error || !verified.data.user ||
          verified.data.user.id !== result.data.session.user.id ||
          verified.data.user.id !== incoming.message.userId) {
        throw new Error('Sessão não confirmada.');
      }
      if (active.current && incoming.revision === sessionRevision.current) {
        setSessionError('');
        verifiedUserIdRef.current = verified.data.user.id;
        setVerifiedUserId(verified.data.user.id);
      }
    } catch {
      if (active.current && incoming.revision === sessionRevision.current) {
        verifiedUserIdRef.current = null;
        setVerifiedUserId(null);
        setSessionError('Não foi possível confirmar a sessão. Feche e abra as etiquetas novamente.');
      }
    } finally {
      sessionInFlight.current = false;
      if (active.current && pendingSession.current) void applyPendingSession();
    }
  }, []);

  useEffect(() => {
    active.current = true;
    const receiveSession = (value: unknown) => {
      if (!isSessionMessage(value)) return;
      if (verifiedUserIdRef.current && verifiedUserIdRef.current !== value.userId) {
        verifiedUserIdRef.current = null;
        setVerifiedUserId(null);
      }
      pendingSession.current = { message: value, revision: ++sessionRevision.current };
      void applyPendingSession();
    };
    const onNativeSession = (event: Event) => {
      if ((window as NativeWindow).ReactNativeWebView) {
        receiveSession((event as CustomEvent<unknown>).detail);
      }
    };
    const onParentMessage = (event: MessageEvent) => {
      if (event.source === window.parent && isTrustedParentOrigin(event.origin)) {
        receiveSession(event.data);
      }
    };
    window.addEventListener('morante-label-session', onNativeSession);
    window.addEventListener('message', onParentMessage);
    (window as NativeWindow).ReactNativeWebView?.postMessage(JSON.stringify({ type: 'morante-label-ready' }));
    if (window.parent !== window) window.parent.postMessage({ type: 'morante-label-ready' }, '*');
    return () => {
      active.current = false;
      pendingSession.current = null;
      window.removeEventListener('morante-label-session', onNativeSession);
      window.removeEventListener('message', onParentMessage);
    };
  }, [applyPendingSession]);

  useEffect(() => {
    if (!loading) void applyPendingSession();
  }, [loading, applyPendingSession]);

  useEffect(() => {
    if (!verifiedUserId || (user?.id === verifiedUserId && profile?.id === verifiedUserId && !loading)) {
      setProfileError(false);
      return;
    }
    const timer = window.setTimeout(() => setProfileError(true), 20_000);
    return () => window.clearTimeout(timer);
  }, [verifiedUserId, user?.id, profile?.id, loading]);

  useEffect(() => {
    if (!verifiedUserId || user?.id !== verifiedUserId || profile?.id !== verifiedUserId || loading) return;
    setPermissionStatus('loading');
    return subscribeToSettings(
      () => refreshPermissions((value) => value + 1),
      { onRemoteLoad: ({ confirmed }) => setPermissionStatus(confirmed ? 'ready' : 'error') }
    );
  }, [verifiedUserId, user?.id, profile?.id, loading, permissionRevision]);

  const hasDirectAuthParams = ['auth_email', 'user_id', 'auth_role'].some((key) => params.has(key));
  const category = params.get('cat');
  const hasReceiptOutsideIdentification = params.has('receiptId') && category !== 'identificacao';
  const roles = profile ? getProfileRoles(profile) : [];
  const canViewAll = canPerform('viewStockLabels', roles);
  const canIdentify = canViewAll || canPerform('printProductIdentificationLabels', roles);
  const allowed = category === 'identificacao' ? canIdentify : category === 'precos' && canViewAll;

  if (hasDirectAuthParams) {
    return <p role="alert" className="p-6 text-sm text-red-700">Não foi possível abrir as etiquetas com esta sessão.</p>;
  }
  if (hasReceiptOutsideIdentification) {
    return <p role="alert" className="p-6 text-sm text-red-700">O recebimento só pode preencher etiquetas de identificação.</p>;
  }
  if (sessionError) return <p role="alert" className="p-6 text-sm text-red-700">{sessionError}</p>;
  if (profileError) return <p role="alert" className="p-6 text-sm text-red-700">Não foi possível carregar seu perfil. Feche e abra as etiquetas novamente.</p>;
  if (!verifiedUserId || user?.id !== verifiedUserId || profile?.id !== verifiedUserId || loading || permissionStatus === 'loading') {
    return <p role="status" className="p-6 text-sm text-slate-600">Carregando etiquetas e permissões…</p>;
  }
  if (permissionStatus === 'error') {
    return <div className="p-6 text-sm text-red-700"><p role="alert">Não foi possível confirmar as permissões.</p><button type="button" className="mt-3 text-blue-600 underline" onClick={() => setPermissionRevision((value) => value + 1)}>Tentar novamente</button></div>;
  }
  if (isPending || !allowed) {
    return <p role="alert" className="p-6 text-sm text-slate-700">Seu perfil não tem acesso a esta etiqueta.</p>;
  }
  return <LabelPrinting />;
}
