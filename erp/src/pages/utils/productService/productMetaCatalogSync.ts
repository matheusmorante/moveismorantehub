import { metaHttpClient } from '../metaService/metaHttpClient';
import type { MetaCatalogReconciliationResult as ProductMetaCatalogSyncResult } from '../../../../../shared-utils/metaCatalogReconciliationResult';

type PendingProductMetaCatalogSync = {
  timer: ReturnType<typeof setTimeout> | null;
  promise: Promise<ProductMetaCatalogSyncResult>;
  resolve: (result: ProductMetaCatalogSyncResult) => void;
};

const pendingSyncs = new Map<string, PendingProductMetaCatalogSync>();
const inFlightSyncs = new Map<string, Promise<ProductMetaCatalogSyncResult>>();

async function requestCatalog<T>(
  operation: string, payload: Record<string, unknown>, timeoutMs: number,
): Promise<T> {
  const response = await metaHttpClient.request(operation, payload, undefined, timeoutMs);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Reconciliação do Catálogo Meta indisponível.');
  }
  return body as T;
}

export function syncAllProductsToMetaCatalog(): Promise<ProductMetaCatalogSyncResult> {
  return requestCatalog('reconcile_catalog', {}, 280_000);
}

export async function fetchLastMetaCatalogRun(): Promise<ProductMetaCatalogSyncResult | null> {
  const { lastRun } = await requestCatalog<{ lastRun: ProductMetaCatalogSyncResult | null }>(
    'reconcile_catalog_status', {}, 15_000,
  );
  return lastRun;
}

export async function syncProductToMetaCatalog(
  productId: string,
): Promise<ProductMetaCatalogSyncResult> {
  if (!productId) return { success: false, count: 0, error: 'ID do produto ausente.' };
  try {
    return await requestCatalog('reconcile_catalog', { productId }, 55_000);
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Erro ao sincronizar o produto com a Meta.',
    };
  }
}

function runProductMetaCatalogSync(productId: string): Promise<ProductMetaCatalogSyncResult> {
  const existing = inFlightSyncs.get(productId);
  if (existing) return existing;

  let trackedSync: Promise<ProductMetaCatalogSyncResult>;
  trackedSync = syncProductToMetaCatalog(productId).finally(() => {
    if (inFlightSyncs.get(productId) === trackedSync) inFlightSyncs.delete(productId);
  });
  inFlightSyncs.set(productId, trackedSync);
  return trackedSync;
}

function logProductMetaCatalogSyncResult(
  productId: string,
  result: ProductMetaCatalogSyncResult
): void {
  if (result.success && result.count > 0) {
    console.log(`[MetaCatalogSync] Produto ${productId} sincronizado automaticamente com a Meta (${result.count} itens).`);
  } else if (!result.success) {
    console.warn(`[MetaCatalogSync] Falha ao sincronizar produto ${productId}:`, result.error);
  }
}

/**
 * Dispara a sincronização de um produto com a Meta em segundo plano,
 * com debounce de 400ms para agregar mutações sequenciais.
 */
export function triggerProductMetaCatalogSync(
  productId: string
): Promise<ProductMetaCatalogSyncResult> {
  if (!productId) {
    return Promise.resolve({ success: false, count: 0, error: 'ID do produto ausente.' });
  }

  let pending = pendingSyncs.get(productId);
  if (pending?.timer) clearTimeout(pending.timer);

  if (!pending) {
    let resolvePending!: (result: ProductMetaCatalogSyncResult) => void;
    const promise = new Promise<ProductMetaCatalogSyncResult>((resolve) => {
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
      return runProductMetaCatalogSync(productId);
    })().then((result) => {
      logProductMetaCatalogSyncResult(productId, result);
      scheduled.resolve(result);
    }).catch((err) => {
      const error = err instanceof Error ? err.message : 'Erro desconhecido na sincronização com a Meta.';
      const result = { success: false, count: 0, error };
      logProductMetaCatalogSyncResult(productId, result);
      scheduled.resolve(result);
    });
  }, 400);

  pendingSyncs.set(productId, scheduled);
  return scheduled.promise;
}

/**
 * Aguarda a sincronização já agendada pelo salvamento ou inicia uma nova
 * quando ainda não existe nenhuma pendente/em andamento.
 */
export function ensureProductMetaCatalogSync(
  productId: string
): Promise<ProductMetaCatalogSyncResult> {
  const pending = pendingSyncs.get(productId);
  if (pending) return pending.promise;

  const inFlight = inFlightSyncs.get(productId);
  if (inFlight) return inFlight;

  return triggerProductMetaCatalogSync(productId);
}
