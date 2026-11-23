import type { MetaCatalogReconciliationResult } from '../../../../../shared-utils/metaCatalogReconciliationResult';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { supabase } from '../../../services/supabaseClient';

const pendingSyncs = new Map<string, ReturnType<typeof setTimeout>>();

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

export function triggerMobileProductMetaCatalogSync(productId: string): void {
  if (!productId) return;
  const existing = pendingSyncs.get(productId);
  if (existing) clearTimeout(existing);

  pendingSyncs.set(productId, setTimeout(() => {
    pendingSyncs.delete(productId);
    void syncMobileProductToMetaCatalog(productId).then((result) => {
      if (!result.success) console.warn('[MetaCatalog] Falha na sincronização do produto.', productId, result.error);
    });
  }, 400));
}
