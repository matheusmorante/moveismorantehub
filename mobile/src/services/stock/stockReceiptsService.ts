import { supabase } from '../supabaseClient';
import { ITEMS_PER_PAGE } from './stockPagination';
import { offlineStorageService, generateUUID } from '../offline/offlineStorageService';
import { connectivityService } from '../offline/connectivityService';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import { mapInboundInvoiceListRow } from './invoices/inboundInvoiceMappers';
import {
  buildInboundInvoiceSearchFilter,
  getInvoiceDateBounds,
} from '../../features/stock/invoices/utils/invoiceList';
import type { InvoiceDateFilter } from '../../features/stock/types/stock.types';

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

export interface NewMobileGoodsReceipt {
  id: string;
  purchaseId?: string;
  supplierId: string;
  supplierName: string;
  receivedAt: string;
  totalValue: number;
  observation?: string;
  invoiceId?: string;
  invoiceComplete?: boolean;
  invoiceNumber?: string;
  invoiceDate?: string;
  fiscalKey?: string;
  ipiPercent?: number;
  freightPercent?: number;
  fiscalIpi?: number;
  fiscalFreight?: number;
  fiscalDiscount?: number;
  fiscalOtherExpenses?: number;
  items: Array<{
    productId: string;
    variationId?: string;
    description: string;
    quantity: number;
    baseCost: number;
    unitCost: number;
    totalCost: number;
    freightFiscalUnit?: number;
    freightNonFiscalUnit?: number;
    discountUnit?: number;
    otherExpensesFiscalUnit?: number;
    otherExpensesNonFiscalUnit?: number;
    additionalCostUnit?: number;
    sku?: string;
  }>;
}

/** Confirma uma nova entrada usando a mesma transação atômica do ERP. */
export const createMobileGoodsReceipt = async (receipt: NewMobileGoodsReceipt): Promise<{ invoiceUpdated: boolean }> => {
  if (!connectivityService.connected) {
    throw new Error('Conecte-se à internet para confirmar o recebimento.');
  }

  const rpcPromise = supabase.rpc('confirm_goods_receipt_checked_transaction', {
    p_receipt: {
      id: receipt.id,
      receipt_index: null,
      purchase_id: receipt.purchaseId || null,
      supplier_id: receipt.supplierId,
      supplier_name: receipt.supplierName,
      received_at: receipt.receivedAt,
      invoice_number: receipt.invoiceNumber || null,
      invoice_date: receipt.invoiceDate || null,
      total_value: receipt.totalValue,
      observation: receipt.observation || '',
      fiscal_key: receipt.fiscalKey || null,
      attachments: [],
      status: 'received',
      is_draft: false,
      ipi_percent: receipt.ipiPercent || 0,
      freight_percent: receipt.freightPercent || 0,
      non_fiscal_discount_mode: null,
      non_fiscal_discount_value: 0,
      non_fiscal_freight_mode: null,
      non_fiscal_freight_value: 0,
      non_fiscal_other_expenses_mode: null,
      non_fiscal_other_expenses_value: 0,
      fiscal_ipi: receipt.fiscalIpi || 0,
      fiscal_freight: receipt.fiscalFreight || 0,
      fiscal_discount: receipt.fiscalDiscount || 0,
      fiscal_other_expenses: receipt.fiscalOtherExpenses || 0,
    },
    p_items: receipt.items.map((item) => ({
      ...item,
      freightFiscalUnit: item.freightFiscalUnit || 0,
      freightNonFiscalUnit: item.freightNonFiscalUnit || 0,
      discountUnit: item.discountUnit || 0,
      otherExpensesFiscalUnit: item.otherExpensesFiscalUnit || 0,
      otherExpensesNonFiscalUnit: item.otherExpensesNonFiscalUnit || 0,
      additionalCostUnit: item.additionalCostUnit || 0,
    })),
  });
  let result = await withTimeout<any | null>(
    Promise.resolve(rpcPromise),
    20_000,
    null,
    'mobile:goods-receipt-confirmation'
  );
  if (!result) {
    let confirmed: any = null;
    try {
      const check = supabase.from('goods_receipts').select('id,status').eq('id', receipt.id).maybeSingle();
      confirmed = await withTimeout<any | null>(Promise.resolve(check), 10_000, null, 'mobile:receipt-confirmation-check');
    } catch { /* O resultado permanece incerto. */ }
    if (confirmed && !confirmed.error && confirmed.data?.status === 'received') {
      result = { data: { receiptId: receipt.id }, error: null };
    } else {
      throw new Error('A confirmação demorou. Confira a lista de recebimentos antes de tentar novamente.');
    }
  }
  if (result.error) throw new Error(result.error.message || 'Não foi possível confirmar o recebimento.');
  if (result.data?.receiptId !== receipt.id) {
    throw new Error('A confirmação não retornou o resultado esperado. Confira a lista de recebimentos.');
  }
  if (!receipt.invoiceId || !receipt.invoiceComplete) return { invoiceUpdated: true };

  try {
    const update = supabase.from('inbound_invoices').update({
      status_recebimento: 'received', receipt_id: receipt.id, updated_at: new Date().toISOString(),
    }).eq('id', receipt.invoiceId).is('receipt_id', null).select('id').maybeSingle();
    const updated = await withTimeout<any | null>(Promise.resolve(update), 10_000, null, 'mobile:receipt-invoice-link');
    return { invoiceUpdated: Boolean(updated && !updated.error && updated.data) };
  } catch {
    return { invoiceUpdated: false };
  }
};

export const fetchReceiptInvoiceSources = async (
  page: number,
  search: string,
  dateFilter: InvoiceDateFilter,
) => {
  const from = page * ITEMS_PER_PAGE;
  const dateBounds = getInvoiceDateBounds(dateFilter);
  if (!dateBounds) throw new Error('Informe um período válido para buscar as notas fiscais.');
  let query = supabase.from('inbound_invoices').select(
    'id,numero_nfe,serie,chave_acesso,emitente_nome,emitente_cnpj,data_emissao,valor_total,status_recebimento,itens,xml_conteudo,supplier:people!inner(stock_origins),inbound_invoice_items(*)',
    { count: 'exact' }
  ).contains('supplier.stock_origins', ['normal'])
    .gte('data_emissao', dateBounds.start)
    .lte('data_emissao', dateBounds.end);
  const filter = buildInboundInvoiceSearchFilter(search);
  if (filter) query = query.or(filter);
  const response = await withTimeout<any | null>(
    Promise.resolve(query.order('data_emissao', { ascending: false }).range(from, from + ITEMS_PER_PAGE - 1)),
    12_000, null, 'mobile:receipt-invoice-sources'
  );
  if (!response) throw new Error('A busca de notas demorou. Tente novamente.');
  if (response.error) throw response.error;
  const data = (response.data || []).map(mapInboundInvoiceListRow);
  return {
    data: data.filter((invoice: any) => invoice.supplierStockOrigins?.includes('normal')),
    count: response.count || 0,
  };
};

export const fetchInvoiceReceiptItems = async (fiscalKey: string, exceptReceiptId?: string) => {
  let query = supabase.from('goods_receipts')
    .select('goods_receipt_items(product_id,variation_id,quantity)')
    .eq('fiscal_key', fiscalKey).eq('status', 'received');
  if (exceptReceiptId) query = query.neq('id', exceptReceiptId);
  const response = await withTimeout<any | null>(Promise.resolve(query), 12_000, null, 'mobile:invoice-previous-receipts');
  if (!response) throw new Error('Não foi possível conferir os recebimentos anteriores. Tente novamente.');
  if (response.error) throw new Error('Não foi possível conferir os recebimentos anteriores.');
  return (response.data || []).flatMap((receipt: any) => receipt.goods_receipt_items || []);
};

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
