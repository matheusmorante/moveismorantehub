import { supabase } from '../supabaseClient';

export const processNextAutomaticInboundScience = async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) {
    return { data: null, error: { message: 'Faça login novamente para processar a Ciência automática.' } };
  }

  const apiBase = (process.env.EXPO_PUBLIC_ERP_API_URL || 'https://morantehub.com').replace(/\/$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${apiBase}/api/nfe/inbound-manifestation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'process-auto' }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    return {
      data: { ...result, retryable: result.retryable === true || response.status >= 500 },
      error: response.ok ? null : { message: result.error || 'Não foi possível processar a Ciência automática.' },
    };
  } catch {
    return { data: null, error: { message: 'Falha de comunicação ao processar a Ciência automática.' } };
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Consulta o status atual de sincronização SEFAZ persistido no Supabase
 * sem bater no Web Service oficial (R$ 0,00 e sem risco de cStat 656).
 */
export const fetchSefazSyncStatus = async () => {
  try {
    const { data, error } = await supabase
      .from('sefaz_nsu_control')
      .select(
        'status, last_sync_at, next_allowed_sync_at, last_cstat, last_xmotivo, last_docs_count'
      )
      .eq('id', 'default')
      .maybeSingle();
    if (error || !data) return null;
    const now = Date.now();
    const lastSyncMs = data.last_sync_at ? new Date(data.last_sync_at).getTime() : 0;
    const storedNextAllowed = data.next_allowed_sync_at
      ? new Date(data.next_allowed_sync_at).getTime()
      : 0;
    const effectiveNextAllowed = Math.max(
      storedNextAllowed,
      lastSyncMs ? lastSyncMs + 60 * 60 * 1000 : 0,
    );
    const isSyncing = data.status === 'syncing' && now - lastSyncMs < 180_000;
    return {
      ...data,
      can_sync_now: !isSyncing && now >= effectiveNextAllowed,
      next_allowed_sync_at: effectiveNextAllowed
        ? new Date(effectiveNextAllowed).toISOString()
        : null,
    };
  } catch {
    return null;
  }
};

/**
 * Dispara uma sincronização ou retry pontual de NF-e via Edge Function
 */
export const triggerSefazSync = async () => {
  return await supabase.functions.invoke('sefaz-inbound-sync', {
    body: { environment: 'production' },
  });
};

/** Processa no máximo um NSU faltante da fila, respeitando a trava global de cinco minutos. */
export const recoverNextMissingNsuFromSefaz = async () => {
  return await supabase.functions.invoke('sefaz-inbound-sync', {
    body: { action: 'recover-missing-nsu', environment: 'production' },
  });
};
