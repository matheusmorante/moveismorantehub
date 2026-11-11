import { supabase } from '@/pages/utils/supabaseConfig';
import {
  GoodsReceipt,
  FetchGoodsReceiptsOptions,
  FetchGoodsReceiptsResult,
  GoodsReceiptSubscriptionResult,
  STATUS_RANK,
} from './goodsReceipt.types';
import {
  getStoredReceipts,
  saveStoredReceipts,
  ensureReceiptIndexes,
  addReceiptListener,
  removeReceiptListener,
} from './goodsReceiptStorage';
import { mapGoodsReceiptRow } from './goodsReceiptMapper';
import { buildPostgrestAccentInsensitiveOrFilter } from '../../../../../shared-utils/searchText';
import { normalizeFiscalIdentifier } from '../../../../../shared-utils/fiscalIdentifiers';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

export const fetchGoodsReceiptByFiscalKey = async (fiscalKey: string): Promise<GoodsReceipt | null> => {
  const originalKey = String(fiscalKey || '').trim();
  const normalizedKey = normalizeFiscalIdentifier(originalKey);
  const fiscalKeys = Array.from(new Set([originalKey, normalizedKey].filter(Boolean)));
  if (fiscalKeys.length === 0) return null;

  const response = await withTimeout<any | null>(
    supabase
      .from('goods_receipts')
      .select('*, goods_receipt_items(*)')
      .in('fiscal_key', fiscalKeys)
      .maybeSingle(),
    12_000,
    null,
    'erp:goods-receipt-by-fiscal-key',
  );
  if (!response) throw new Error('O recebimento vinculado demorou para carregar. Tente novamente.');
  if (response.error) throw response.error;
  return response.data ? mapGoodsReceiptRow(response.data) : null;
};

const RECEIPTS_PAGE_SIZE = 15;
const RECEIPTS_QUERY_TIMEOUT_MS = 12_000;

interface GoodsReceiptPageOptions extends FetchGoodsReceiptsOptions {
  supplierId?: string;
  supplierName?: string;
  startDate?: string;
  endDate?: string;
}

interface GoodsReceiptSubscription {
  updateQuery: (options: GoodsReceiptPageOptions) => void;
  unsubscribe: () => void;
}

const normalizePage = (page?: number) =>
  Number.isFinite(page) ? Math.max(1, Math.floor(page as number)) : 1;

const queryKey = (options: GoodsReceiptPageOptions) =>
  JSON.stringify([
    normalizePage(options.page),
    options.supplierId ?? null,
    options.supplierName ?? null,
    options.startDate ?? null,
    options.endDate ?? null,
    options.searchTerm?.trim() ?? '',
    options.status ?? null,
  ]);

const utcDayStart = (date: string): string => {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Data inválida no filtro de recebimentos.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) {
    throw new Error('Data inválida no filtro de recebimentos.');
  }
  return value.toISOString();
};

const utcDayAfter = (date: string): string => {
  const start = new Date(utcDayStart(date));
  start.setUTCDate(start.getUTCDate() + 1);
  return start.toISOString();
};

const createReceiptPageQuery = (options: GoodsReceiptPageOptions) => {
  const supplierId = options.supplierId || undefined;
  const page = normalizePage(options.page);
  const firstRow = (page - 1) * RECEIPTS_PAGE_SIZE;
  const lastRow = firstRow + RECEIPTS_PAGE_SIZE - 1;
  const selection = '*, goods_receipt_items(*)';

  let query = supplierId
    ? supabase
        .rpc('filter_goods_receipts_by_supplier', {
          p_supplier_id: supplierId,
          p_supplier_name: options.supplierName ?? null,
        })
        .select(selection, { count: 'exact' })
    : supabase.from('goods_receipts').select(selection, { count: 'exact' });

  if (options.status) query = query.eq('status', options.status);
  if (options.searchTerm?.trim()) {
    query = query.or(
      buildPostgrestAccentInsensitiveOrFilter(
        ['supplier_name', 'invoice_number'],
        options.searchTerm.trim()
      )
    );
  }
  if (options.startDate) query = query.gte('received_at', utcDayStart(options.startDate));
  if (options.endDate) query = query.lt('received_at', utcDayAfter(options.endDate));

  return query
    .order('updated_at', { ascending: false })
    .order('id', { ascending: true })
    .range(firstRow, lastRow);
};

const fetchGoodsReceiptsPageFromServer = async (
  options: GoodsReceiptPageOptions = {}
): Promise<FetchGoodsReceiptsResult> => {
  const page = normalizePage(options.page);
  const response = await withTimeout<any | null>(
    createReceiptPageQuery(options),
    RECEIPTS_QUERY_TIMEOUT_MS,
    null,
    'erp:goods-receipts-page'
  );
  if (!response) throw new Error('A lista de recebimentos demorou para atualizar.');
  if (response.error) throw response.error;

  const totalCount = response.count ?? 0;
  return {
    items: (response.data || []).map(mapGoodsReceiptRow),
    totalCount,
    page,
    pageSize: RECEIPTS_PAGE_SIZE,
    totalPages: Math.ceil(totalCount / RECEIPTS_PAGE_SIZE),
  };
};

export const fetchGoodsReceiptsPage = async (
  options?: FetchGoodsReceiptsOptions
): Promise<FetchGoodsReceiptsResult> => {
  try {
    const result = await fetchGoodsReceiptsPageFromServer(options);
    return { ...result, items: await ensureReceiptIndexes(result.items) };
  } catch (error) {
    console.error('[GoodsReceipts] Erro ao buscar página:', error);
    const page = normalizePage(options?.page);
    return { items: [], totalCount: 0, page, pageSize: RECEIPTS_PAGE_SIZE, totalPages: 0 };
  }
};

const isBrowserOnline = () =>
  typeof navigator === 'undefined' || navigator.onLine !== false;

const dateOnlyForReceipt = (receipt: GoodsReceipt): string | null => {
  const value = receipt.receivedAt || receipt.createdAt;
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const month = Number(match[2]);
    const day = Number(match[3]);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31
      ? `${match[1]}-${match[2]}-${match[3]}`
      : null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const receiptMatchesQuery = (receipt: GoodsReceipt, options: GoodsReceiptPageOptions) => {
  if (options.supplierId) {
    const matchesId = Boolean(receipt.supplierId && receipt.supplierId === options.supplierId);
    const matchesLegacyName = Boolean(
      options.supplierName !== undefined &&
        receipt.supplierName &&
        (
          receipt.supplierName.toLowerCase().includes(options.supplierName.toLowerCase()) ||
          options.supplierName.toLowerCase().includes(receipt.supplierName.toLowerCase())
        )
    );
    if (!matchesId && !matchesLegacyName) return false;
  }

  const dateOnly = dateOnlyForReceipt(receipt);
  if (!dateOnly) return false;
  if (options.startDate && dateOnly < options.startDate) return false;
  if (options.endDate && dateOnly > options.endDate) return false;
  if (options.status && receipt.status !== options.status) return false;
  if (options.searchTerm?.trim()) {
    const needle = options.searchTerm.trim().toLocaleLowerCase();
    if (
      !receipt.supplierName.toLocaleLowerCase().includes(needle) &&
      !(receipt.invoiceNumber || '').toLocaleLowerCase().includes(needle)
    ) {
      return false;
    }
  }
  return true;
};

const sortReceipts = (items: GoodsReceipt[]) =>
  items.sort((a, b) => {
    const updatedAtDifference =
      new Date(b.updatedAt || b.receivedAt).getTime() -
      new Date(a.updatedAt || a.receivedAt).getTime();
    return updatedAtDifference || String(a.id).localeCompare(String(b.id));
  });

const createCachedPage = (
  localItems: GoodsReceipt[],
  options: GoodsReceiptPageOptions
): GoodsReceiptSubscriptionResult => {
  const filteredItems = sortReceipts(localItems.filter((item) => receiptMatchesQuery(item, options)));
  const totalCount = filteredItems.length;
  const totalPages = Math.ceil(totalCount / RECEIPTS_PAGE_SIZE);
  const page = Math.min(normalizePage(options.page), Math.max(totalPages, 1));
  const firstRow = (page - 1) * RECEIPTS_PAGE_SIZE;

  return {
    items: filteredItems.slice(firstRow, firstRow + RECEIPTS_PAGE_SIZE),
    totalCount,
    page,
    pageSize: RECEIPTS_PAGE_SIZE,
    totalPages,
    isFromCache: true,
  };
};

const mergeReceiptState = (local: GoodsReceipt | undefined, remote: GoodsReceipt) => {
  if (!local) return remote;
  const localRank = STATUS_RANK[local.status] ?? 0;
  const remoteRank = STATUS_RANK[remote.status] ?? 0;
  const winner = localRank > remoteRank ? local : remote;
  return {
    ...winner,
    receiptIndex: winner.receiptIndex || local.receiptIndex || remote.receiptIndex,
  };
};

const mergePageIntoCache = (localItems: GoodsReceipt[], pageItems: GoodsReceipt[]) => {
  const merged = new Map(localItems.map((item) => [item.id, item]));
  pageItems.forEach((item) => merged.set(item.id, mergeReceiptState(merged.get(item.id), item)));
  return Array.from(merged.values());
};

export const subscribeToGoodsReceipts = (
  callback: (result: GoodsReceiptSubscriptionResult) => void,
  initialOptions: GoodsReceiptPageOptions
): GoodsReceiptSubscription => {
  let active = true;
  let localRevision = 0;
  let loadRevision = 0;
  let options = initialOptions;
  let activeQueryKey = queryKey(initialOptions);
  let requestTimer: ReturnType<typeof setTimeout> | null = null;
  let realtimeTimer: ReturnType<typeof setTimeout> | null = null;

  const load = async () => {
    const currentLoadRevision = ++loadRevision;
    const currentLocalRevision = localRevision;
    const localItems = getStoredReceipts();

    if (!isBrowserOnline()) {
      if (active && currentLoadRevision === loadRevision) {
        const cachedPage = createCachedPage(localItems, options);
        callback({ ...cachedPage, items: await ensureReceiptIndexes(cachedPage.items) });
      }
      return;
    }

    try {
      const serverPage = await fetchGoodsReceiptsPageFromServer(options);
      if (!active || currentLoadRevision !== loadRevision) return;
      if (currentLocalRevision !== localRevision) return;

      const localById = new Map(localItems.map((item) => [item.id, item]));
      const mergedPage = serverPage.items.map((item) => mergeReceiptState(localById.get(item.id), item));
      const indexedPage = await ensureReceiptIndexes(mergedPage);
      if (!active || currentLoadRevision !== loadRevision) return;
      if (currentLocalRevision !== localRevision) return;

      saveStoredReceipts(mergePageIntoCache(localItems, indexedPage));
      const totalPages = serverPage.totalPages;
      const page = Math.min(serverPage.page, Math.max(totalPages, 1));
      callback({
        ...serverPage,
        items: indexedPage,
        page,
        isFromCache: false,
      });
    } catch {
      if (!active || currentLoadRevision !== loadRevision) return;
      if (currentLocalRevision !== localRevision) return;
      const cachedPage = createCachedPage(localItems, options);
      callback({ ...cachedPage, items: await ensureReceiptIndexes(cachedPage.items) });
    }
  };

  const scheduleLoad = (delayMs: number) => {
    if (requestTimer) clearTimeout(requestTimer);
    requestTimer = setTimeout(() => {
      requestTimer = null;
      void load();
    }, delayMs);
  };

  const debouncedRealtimeLoad = () => {
    if (realtimeTimer) clearTimeout(realtimeTimer);
    realtimeTimer = setTimeout(() => {
      realtimeTimer = null;
      void load();
    }, 3000);
  };

  const localListener = (items: GoodsReceipt[]) => {
    localRevision += 1;
    callback(createCachedPage(items, options));
    if (isBrowserOnline()) debouncedRealtimeLoad();
  };
  addReceiptListener(localListener);

  const handleOffline = () => {
    loadRevision += 1;
    callback(createCachedPage(getStoredReceipts(), options));
  };
  const handleOnline = () => {
    if (requestTimer) clearTimeout(requestTimer);
    requestTimer = null;
    if (realtimeTimer) clearTimeout(realtimeTimer);
    realtimeTimer = null;
    void load();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
  }

  const channel = supabase
    .channel(`goods_receipts_${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'goods_receipts' },
      debouncedRealtimeLoad
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'goods_receipt_items' },
      debouncedRealtimeLoad
    )
    .subscribe();

  void load();

  return {
    updateQuery: (nextOptions) => {
      const nextKey = queryKey(nextOptions);
      if (nextKey === activeQueryKey) return;
      activeQueryKey = nextKey;
      options = nextOptions;
      loadRevision += 1;
      scheduleLoad(250);
    },
    unsubscribe: () => {
      active = false;
      loadRevision += 1;
      if (requestTimer) clearTimeout(requestTimer);
      if (realtimeTimer) clearTimeout(realtimeTimer);
      removeReceiptListener(localListener);
      if (typeof window !== 'undefined') {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      }
      supabase.removeChannel(channel);
    },
  };
};
