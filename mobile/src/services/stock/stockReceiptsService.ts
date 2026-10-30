import { supabase } from '../supabaseClient';
import { ITEMS_PER_PAGE } from './stockPagination';
import { offlineStorageService, generateUUID } from '../offline/offlineStorageService';
import { connectivityService } from '../offline/connectivityService';

export const GOODS_RECEIPTS_CACHE_KEY = 'goods_receipts_cache_v1';
export const GOODS_RECEIPTS_DRAFTS_KEY = 'goods_receipt_check_drafts_v1';
export const GOODS_RECEIPTS_PENDING_SYNC_KEY = 'goods_receipts_pending_sync_v1';

export interface GoodsReceiptCheckDraft {
  receiptId: string;
  checkedVolumes: number;
  totalVolumes: number;
  observation?: string;
  updatedAt: string;
}

export interface PendingGoodsReceiptCheck {
  idempotencyKey: string;
  receiptId: string;
  checkedVolumes: number;
  totalVolumes: number;
  observation?: string;
  userId?: string | null;
  checkedAt: string;
}

const resolveSessionUserId = async (explicitUserId?: string | null): Promise<string | null> => {
  if (explicitUserId) return explicitUserId;
  try {
    const auth = (supabase as any)?.auth;
    if (typeof auth?.getSession === 'function') {
      const { data } = await auth.getSession();
      return data?.session?.user?.id || null;
    }
  } catch {}
  return null;
};

export const getPendingGoodsReceiptChecks = async (): Promise<PendingGoodsReceiptCheck[]> => {
  try {
    const cached = await offlineStorageService.getWorkingSet<PendingGoodsReceiptCheck[]>(
      GOODS_RECEIPTS_PENDING_SYNC_KEY
    );
    return Array.isArray(cached?.data) ? cached.data : [];
  } catch {
    return [];
  }
};

export const getGoodsReceiptCheckDraft = async (
  receiptId: string
): Promise<GoodsReceiptCheckDraft | null> => {
  try {
    const cached = await offlineStorageService.getWorkingSet<
      Record<string, GoodsReceiptCheckDraft>
    >(GOODS_RECEIPTS_DRAFTS_KEY);
    return cached?.data?.[receiptId] || null;
  } catch {
    return null;
  }
};

export const saveGoodsReceiptCheckDraft = async (
  receiptId: string,
  draft: Omit<GoodsReceiptCheckDraft, 'receiptId' | 'updatedAt'>
): Promise<GoodsReceiptCheckDraft> => {
  const entry: GoodsReceiptCheckDraft = {
    receiptId,
    checkedVolumes: draft.checkedVolumes,
    totalVolumes: draft.totalVolumes,
    observation: draft.observation,
    updatedAt: new Date().toISOString(),
  };
  try {
    const cached = await offlineStorageService.getWorkingSet<
      Record<string, GoodsReceiptCheckDraft>
    >(GOODS_RECEIPTS_DRAFTS_KEY);
    const current = cached?.data && typeof cached.data === 'object' ? cached.data : {};
    await offlineStorageService.cacheWorkingSet(GOODS_RECEIPTS_DRAFTS_KEY, {
      ...current,
      [receiptId]: entry,
    });
  } catch {}
  return entry;
};

export const syncPendingGoodsReceipts = async (
  activeUserId?: string | null
): Promise<number> => {
  if (!connectivityService.connected) return 0;
  const pending = await getPendingGoodsReceiptChecks();
  if (pending.length === 0) return 0;

  const currentUserId = await resolveSessionUserId(activeUserId);
  const remaining: PendingGoodsReceiptCheck[] = [];
  let syncedCount = 0;

  for (const item of pending) {
    if (!connectivityService.connected) {
      remaining.push(item);
      continue;
    }
    // Isolamento multi-usuário: não sincroniza conferência de outro operador
    if (item.userId && currentUserId && item.userId !== currentUserId) {
      remaining.push(item);
      continue;
    }

    try {
      const tableRef = supabase.from('goods_receipts') as any;
      if (typeof tableRef.select === 'function' && typeof tableRef.update === 'function') {
        // Verifica conflito de estorno no servidor antes de aplicar a conferência
        let existingStatus: string | null = null;
        try {
          const selectChain = tableRef.select('id, status');
          if (typeof selectChain?.eq === 'function') {
            const eqChain = selectChain.eq('id', item.receiptId);
            if (typeof eqChain?.maybeSingle === 'function') {
              const { data: currentRow } = await eqChain.maybeSingle();
              existingStatus = currentRow?.status || null;
            }
          }
        } catch {}

        if (existingStatus === 'estornado') {
          // Recebimento estornado no servidor não deve ser sobrescrito como 'received'
          syncedCount++;
          continue;
        }

        const updatePayload: Record<string, unknown> = {
          status: 'received',
          is_draft: false,
          updated_at: item.checkedAt,
        };
        if (item.observation) {
          updatePayload.observation = item.observation;
        }

        const updateChain = tableRef.update(updatePayload);
        const { error } =
          typeof updateChain?.eq === 'function'
            ? await updateChain.eq('id', item.receiptId)
            : { error: null };

        if (!error) {
          syncedCount++;
        } else {
          remaining.push(item);
        }
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  await offlineStorageService.cacheWorkingSet(GOODS_RECEIPTS_PENDING_SYNC_KEY, remaining);
  return syncedCount;
};

export const completeGoodsReceiptCheck = async ({
  receiptId,
  checkedVolumes,
  totalVolumes,
  observation,
  userId,
}: {
  receiptId: string;
  checkedVolumes: number;
  totalVolumes: number;
  observation?: string;
  userId?: string | null;
}): Promise<{ success: boolean; syncedRemotely: boolean }> => {
  const actorUserId = await resolveSessionUserId(userId);
  const now = new Date().toISOString();
  const pendingItem: PendingGoodsReceiptCheck = {
    idempotencyKey: generateUUID(),
    receiptId,
    checkedVolumes,
    totalVolumes,
    observation,
    userId: actorUserId,
    checkedAt: now,
  };

  // 1. Atualiza o rascunho local da conferência
  await saveGoodsReceiptCheckDraft(receiptId, {
    checkedVolumes,
    totalVolumes,
    observation,
  });

  // 2. Enfileira para sincronização com isolamento por usuário
  const pending = await getPendingGoodsReceiptChecks();
  const nextPending = [
    ...pending.filter((p) => p.receiptId !== receiptId),
    pendingItem,
  ];
  await offlineStorageService.cacheWorkingSet(GOODS_RECEIPTS_PENDING_SYNC_KEY, nextPending);

  // 3. Atualiza imediatamente o cache da lista de recebimentos para feedback offline instantâneo
  try {
    const cachedList = await offlineStorageService.getWorkingSet<any[]>(GOODS_RECEIPTS_CACHE_KEY);
    if (Array.isArray(cachedList?.data)) {
      const updatedList = cachedList.data.map((r) =>
        r?.id === receiptId
          ? {
              ...r,
              status: 'received',
              is_draft: false,
              checkedVolumes,
              observation: observation ?? r.observation,
              updated_at: now,
            }
          : r
      );
      await offlineStorageService.cacheWorkingSet(GOODS_RECEIPTS_CACHE_KEY, updatedList);
    }
  } catch {}

  // 4. Se estiver online, sincroniza imediatamente
  let syncedRemotely = false;
  if (connectivityService.connected) {
    const count = await syncPendingGoodsReceipts(actorUserId).catch(() => 0);
    syncedRemotely = count > 0;
  }

  return { success: true, syncedRemotely };
};

/**
 * Recebimentos (Entregas de fornecedores para conferência)
 */
export const fetchReceipts = async (page: number) => {
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const { data, error } = await supabase
    .from('goods_receipts')
    .select('*, goods_receipt_items(*)')
    .order('received_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const pendingChecks = await getPendingGoodsReceiptChecks();
  const pendingByReceiptId = new Map<string, PendingGoodsReceiptCheck>();
  for (const p of pendingChecks) {
    if (p?.receiptId) pendingByReceiptId.set(p.receiptId, p);
  }

  return (data || []).map((r) => {
    const pendingLocal = r?.id ? pendingByReceiptId.get(String(r.id)) : undefined;
    return {
      ...r,
      status: pendingLocal && r.status !== 'estornado' ? 'received' : r.status,
      checkedVolumes: pendingLocal?.checkedVolumes,
      receiptIndex: r.receipt_index ? Number(r.receipt_index) : undefined,
      supplierName: r.supplier_name || 'Fornecedor',
      totalValue: r.total_value || 0,
      items: Array.isArray(r.goods_receipt_items) ? r.goods_receipt_items : [],
    };
  });
};
