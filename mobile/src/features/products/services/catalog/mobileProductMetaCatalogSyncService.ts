import type { MetaCatalogReconciliationResult } from '../../../../../../shared-utils/metaCatalogReconciliationResult';
import { withTimeout } from '../../../../../../shared-utils/core/withTimeout';
import { supabase } from '../../../../services/supabaseClient';

type PendingMobileProductMetaCatalogSync = {
  timer: ReturnType<typeof setTimeout> | null;
  promise: Promise<MobileMetaCatalogSyncResult>;
  resolve: (result: MobileMetaCatalogSyncResult) => void;
};

const pendingSyncs = new Map<string, PendingMobileProductMetaCatalogSync>();
const inFlightSyncs = new Map<string, Promise<MobileMetaCatalogSyncResult>>();

export type MobileMetaCatalogSyncResult = MetaCatalogReconciliationResult;

export async function requestMobileMetaCatalog<T>(
  operation: string, body: Record<string, unknown>, timeoutMs: number,
): Promise<T> {
  const apiBase = process.env.EXPO_PUBLIC_ERP_API_URL?.trim()
    || (process.env.NODE_ENV === 'production' ? 'https://morantehub.vercel.app' : '');
  if (!apiBase) throw new Error('API do ERP indisponível neste ambiente.');
  const session = await withTimeout(supabase.auth.getSession(), 10_000, null, 'mobile:meta-catalog-session');
  const accessToken = session?.data.session?.access_token;
  if (session?.error || !accessToken) throw new Error('Sessão inválida. Entre novamente.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiBase.replace(/\/+$/, '') + '/api/meta-graph', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ operation, ...body }),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(typeof result.error === 'string' ? result.error : 'Reconciliação do Catálogo Meta indisponível.');
    }
    return result as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function syncMobileProductToMetaCatalog(productId: string): Promise<MobileMetaCatalogSyncResult> {
  if (!productId) return { success: false, count: 0, error: 'ID do produto ausente.' };
  try {
    return await requestMobileMetaCatalog('reconcile_catalog', { productId }, 55_000);
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Erro ao sincronizar o produto com a Meta.',
    };
  }
}

function runMobileProductMetaCatalogSync(productId: string): Promise<MobileMetaCatalogSyncResult> {
  const existing = inFlightSyncs.get(productId);
  if (existing) return existing;

  let inFlight: Promise<MobileMetaCatalogSyncResult>;
  inFlight = syncMobileProductToMetaCatalog(productId).finally(() => {
    if (inFlightSyncs.get(productId) === inFlight) inFlightSyncs.delete(productId);
  });
  inFlightSyncs.set(productId, inFlight);
  return inFlight;
}

/** Debounces sequential saves and lets catalog hiding await Meta confirmation. */
export function triggerMobileProductMetaCatalogSync(
  productId: string
): Promise<MobileMetaCatalogSyncResult> {
  if (!productId) {
    return Promise.resolve({ success: false, count: 0, error: 'ID do produto ausente.' });
  }

  let pending = pendingSyncs.get(productId);
  if (pending?.timer) clearTimeout(pending.timer);

  if (!pending) {
    let resolvePending!: (result: MobileMetaCatalogSyncResult) => void;
    const promise = new Promise<MobileMetaCatalogSyncResult>((resolve) => {
      resolvePending = resolve;
    });
    pending = { timer: null, promise, resolve: resolvePending };
  }

  const scheduled = pending;
  scheduled.timer = setTimeout(() => {
    if (pendingSyncs.get(productId) !== scheduled) return;
    pendingSyncs.delete(productId);
    scheduled.timer = null;

    void (async () => {
      const inFlight = inFlightSyncs.get(productId);
      if (inFlight) await inFlight;
      return runMobileProductMetaCatalogSync(productId);
    })().then((result) => {
      if (!result.success) {
        console.warn('[MetaCatalog] Falha na sincronização do produto.', productId, result.error);
      }
      scheduled.resolve(result);
    }).catch((error) => {
      const result = {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Erro ao sincronizar o produto com a Meta.',
      };
      console.warn('[MetaCatalog] Falha na sincronização do produto.', productId, result.error);
      scheduled.resolve(result);
    });
  }, 400);

  pendingSyncs.set(productId, scheduled);
  return scheduled.promise;
}
