import { supabase } from '@/pages/utils/supabaseConfig';

export interface SefazSyncStatus {
  status: 'idle' | 'syncing' | 'rate_limited' | 'error';
  lastSyncAt: string | null;
  nextAllowedSyncAt: string | null;
  lastNsu: string;
  maxNsu: string;
  lastCstat: string | null;
  lastXmotivo: string | null;
  lastDocsCount: number;
  environment: 'production' | 'homologation';
  canSyncNow: boolean;
}

export interface SefazSyncResult {
  success: boolean;
  queryType?: string;
  recoveryAttempted?: boolean;
  environment?: 'production' | 'homologation';
  cStat?: string;
  xMotivo?: string;
  ultNSU?: string;
  maxNSU?: string;
  newDocsCount?: number;
  durationMs?: number;
  message?: string;
  code?: string;
  retryAfter?: string;
  nextAllowedSyncAt?: string;
}

export interface InboundManifestationResult {
  success: boolean;
  pending?: boolean;
  communicationUnconfirmed?: boolean;
  alreadyProcessed?: boolean;
  processed?: boolean;
  processedCount?: number;
  rejectedCount?: number;
  pendingCount?: number;
  hasMore?: boolean;
  retryable?: boolean;
  retryAfter?: string | null;
  nextAllowedAt?: string | null;
  xmlRetrieved?: boolean;
  xmlItemsCount?: number;
  xmlLookupPending?: boolean;
  sefazBlocked?: boolean;
  skipped?: boolean;
  cStat?: string | null;
  xMotivo?: string | null;
  protocolNumber?: string | null;
  protocolDate?: string | null;
  error?: string;
  message?: string;
}

/**
 * Consulta o status atual de sincronização SEFAZ persistido no Supabase
 * sem realizar requisição externa ao Web Service (R$ 0,00 e sem risco de 656).
 */
export async function fetchSefazSyncStatus(): Promise<SefazSyncStatus> {
  try {
    const { data, error } = await supabase
      .from('sefaz_nsu_control')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) {
      return {
        status: 'idle',
        lastSyncAt: null,
        nextAllowedSyncAt: null,
        lastNsu: '0',
        maxNsu: '0',
        lastCstat: null,
        lastXmotivo: null,
        lastDocsCount: 0,
        environment: 'production',
        canSyncNow: true,
      };
    }

    const now = Date.now();
    const lastSyncMs = data.last_sync_at ? new Date(data.last_sync_at).getTime() : 0;
    const storedNextAllowed = data.next_allowed_sync_at
      ? new Date(data.next_allowed_sync_at).getTime()
      : 0;
    const nextAllowed = Math.max(
      storedNextAllowed,
      lastSyncMs ? lastSyncMs + 60 * 60 * 1000 : 0,
    );
    const isSyncing = data.status === 'syncing' && now - lastSyncMs < 180000;
    const isRateLimited =
      (data.status === 'rate_limited' || data.last_cstat === '656') && now < nextAllowed;
    const canSyncNow = !isSyncing && now >= nextAllowed;

    return {
      status: isSyncing ? 'syncing' : isRateLimited ? 'rate_limited' : data.status || 'idle',
      lastSyncAt: data.last_sync_at,
      nextAllowedSyncAt: nextAllowed ? new Date(nextAllowed).toISOString() : null,
      lastNsu: data.last_nsu || '0',
      maxNsu: data.max_nsu || '0',
      lastCstat: data.last_cstat || null,
      lastXmotivo: data.last_xmotivo || null,
      lastDocsCount: data.last_docs_count || 0,
      environment: (data.environment as 'production' | 'homologation') || 'production',
      canSyncNow,
    };
  } catch (err) {
    console.error('[sefazInboundSyncService] Erro ao buscar status:', err);
    return {
      status: 'idle',
      lastSyncAt: null,
      nextAllowedSyncAt: null,
      lastNsu: '0',
      maxNsu: '0',
      lastCstat: null,
      lastXmotivo: null,
      lastDocsCount: 0,
      environment: 'production',
      canSyncNow: true,
    };
  }
}

/**
 * Dispara o ciclo de sincronização automática com o Ambiente Nacional via distNSU.
 * Respeita localmente o cooldown para não bombardear a SEFAZ.
 */
export async function syncInboundInvoicesFromSefaz(options?: {
  environment?: 'production' | 'homologation';
}): Promise<SefazSyncResult> {
  const status = await fetchSefazSyncStatus();
  if (!status.canSyncNow && status.nextAllowedSyncAt) {
    const nextAllowedDate = new Date(status.nextAllowedSyncAt);
    const diffMinutes = Math.max(1, Math.ceil((nextAllowedDate.getTime() - Date.now()) / 60000));
    return {
      success: false,
      code: 'SEFAZ_COOLDOWN',
      nextAllowedSyncAt: status.nextAllowedSyncAt,
      message: `SEFAZ consultada recentemente. Nova consulta automática permitida em aproximadamente ${diffMinutes} min.`,
    };
  }

  const { data, error } = await supabase.functions.invoke('sefaz-inbound-sync', {
    body: {
      environment: options?.environment || status.environment || 'production',
    },
  });

  if (error) {
    return {
      success: false,
      message: error.message || 'Erro ao invocar função de sincronização SEFAZ.',
    };
  }

  return data as SefazSyncResult;
}

/** Processa no máximo um NSU faltante já descoberto pela distribuição, sob a trava global de cinco minutos. */
export async function recoverNextMissingNsuFromSefaz(): Promise<SefazSyncResult> {
  const { data, error } = await supabase.functions.invoke('sefaz-inbound-sync', {
    body: { action: 'recover-missing-nsu' },
  });

  if (error) {
    return {
      success: false,
      message: error.message || 'Erro ao recuperar NSU faltante da SEFAZ.',
    };
  }

  return data as SefazSyncResult;
}

/** Envia uma Ciência da Emissão apenas após ação explícita do operador na tela de entrada. */
export async function sendInboundScienceOfEmission(
  accessKey: string,
  productionConfirmed: boolean
): Promise<InboundManifestationResult> {
  const cleanKey = accessKey.replace(/\D/g, '');
  if (cleanKey.length !== 44)
    return { success: false, error: 'A chave de acesso deve conter exatamente 44 dígitos.' };

  const { data, error: sessionError } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (sessionError || !token)
    return { success: false, error: 'Faça login novamente antes de enviar a Ciência da Emissão.' };

  try {
    const response = await fetch('/api/nfe/inbound-manifestation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        accessKey: cleanKey,
        requestId: crypto.randomUUID(),
        productionConfirmed,
      }),
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    return {
      success: response.ok && result.success === true,
      pending: result.pending === true,
      alreadyProcessed: result.alreadyProcessed === true,
      cStat: typeof result.cStat === 'string' ? result.cStat : null,
      xMotivo: typeof result.xMotivo === 'string' ? result.xMotivo : null,
      protocolNumber: typeof result.protocolNumber === 'string' ? result.protocolNumber : null,
      protocolDate: typeof result.protocolDate === 'string' ? result.protocolDate : null,
      error: typeof result.error === 'string' ? result.error : undefined,
    };
  } catch {
    return {
      success: false,
      pending: true,
      error: 'Não foi possível confirmar a resposta. Confira o histórico fiscal antes de tentar novamente.',
    };
  }
}

/** Envia um lote de até vinte Ciências habilitadas pelo operador nas configurações fiscais. */
export async function processNextAutomaticInboundScience(): Promise<InboundManifestationResult> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (sessionError || !token)
    return { success: false, error: 'Faça login novamente para processar a Ciência automática.' };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch('/api/nfe/inbound-manifestation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'process-auto' }),
      cache: 'no-store',
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    return {
      success: response.ok && result.success === true,
      pending: result.pending === true,
      alreadyProcessed: result.alreadyProcessed === true,
      processed: result.processed === true,
      processedCount: Number.isFinite(result.processedCount) ? result.processedCount : undefined,
      rejectedCount: Number.isFinite(result.rejectedCount) ? result.rejectedCount : undefined,
      pendingCount: Number.isFinite(result.pendingCount) ? result.pendingCount : undefined,
      hasMore: result.hasMore === true,
      retryable: result.retryable === true || response.status >= 500,
      retryAfter: typeof result.retryAfter === 'string' ? result.retryAfter : null,
      nextAllowedAt: typeof result.nextAllowedAt === 'string' ? result.nextAllowedAt : null,
      xmlRetrieved: result.xmlRetrieved === true,
      xmlItemsCount: Number.isFinite(result.xmlItemsCount) ? result.xmlItemsCount : undefined,
      xmlLookupPending: result.xmlLookupPending === true,
      sefazBlocked: result.sefazBlocked === true,
      skipped: result.skipped === true,
      cStat: typeof result.cStat === 'string' ? result.cStat : null,
      xMotivo: typeof result.xMotivo === 'string' ? result.xMotivo : null,
      protocolNumber: typeof result.protocolNumber === 'string' ? result.protocolNumber : null,
      protocolDate: typeof result.protocolDate === 'string' ? result.protocolDate : null,
      error: typeof result.error === 'string' ? result.error : undefined,
      message: typeof result.message === 'string' ? result.message : undefined,
    };
  } catch {
    return {
      success: false,
      pending: false,
      communicationUnconfirmed: true,
      retryable: true,
      error: 'Não foi possível receber a resposta do lote. O envio pode ter sido processado; confira o Histórico Fiscal antes de tentar novamente.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
