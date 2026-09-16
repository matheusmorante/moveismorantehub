import { supabase } from '@/pages/utils/supabaseConfig';
import { GoodsReceipt, FetchGoodsReceiptsOptions, FetchGoodsReceiptsResult, STATUS_RANK } from './goodsReceipt.types';
import { 
    getStoredReceipts, 
    saveStoredReceipts, 
    ensureReceiptIndexes, 
    addReceiptListener, 
    removeReceiptListener 
} from './goodsReceiptStorage';
import { mapGoodsReceiptRow } from './goodsReceiptMapper';

export const fetchGoodsReceiptsPage = async (options?: FetchGoodsReceiptsOptions): Promise<FetchGoodsReceiptsResult> => {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 30;
    const searchTerm = (options?.searchTerm || '').trim();
    const status = options?.status;

    const firstRow = (page - 1) * pageSize;
    const lastRow = firstRow + pageSize - 1;

    let query = supabase
        .from('goods_receipts')
        .select('*, goods_receipt_items(*)', { count: 'exact' });

    if (status) {
        query = query.eq('status', status);
    }

    if (searchTerm) {
        query = query.or(`supplier_name.ilike.%${searchTerm}%,invoice_number.ilike.%${searchTerm}%`);
    }

    query = query.order('updated_at', { ascending: false }).range(firstRow, lastRow);

    const { data, count, error } = await query;
    if (error) {
        console.error('[GoodsReceipts] Erro ao buscar página:', error);
        return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }

    const items = (data || []).map(mapGoodsReceiptRow);
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return { items, totalCount, page, pageSize, totalPages };
};

export const subscribeToGoodsReceipts = (callback: (items: GoodsReceipt[]) => void) => {
    addReceiptListener(callback);

    const load = async () => {
        const localItems = ensureReceiptIndexes(getStoredReceipts());
        try {
            const { data, error } = await supabase
                .from('goods_receipts')
                .select('*, goods_receipt_items(*)')
                .order('updated_at', { ascending: false })
                .limit(30);
            if (!error && data?.length) {
                const dbItems = data.map(mapGoodsReceiptRow);
                const mergedMap = new Map<string, GoodsReceipt>();
                localItems.forEach((item) => mergedMap.set(item.id, item));
                dbItems.forEach((item) => {
                    const existingLocal = mergedMap.get(item.id);
                    if (existingLocal) {
                        const localRank = STATUS_RANK[existingLocal.status] ?? 0;
                        const dbRank = STATUS_RANK[item.status] ?? 0;
                        const winner = localRank > dbRank ? existingLocal : item;
                        mergedMap.set(item.id, {
                            ...winner,
                            receiptIndex: winner.receiptIndex || existingLocal?.receiptIndex || item.receiptIndex,
                        });
                    } else {
                        mergedMap.set(item.id, item);
                    }
                });
                const mergedList = Array.from(mergedMap.values()).sort(
                    (a, b) => new Date(b.updatedAt || b.receivedAt).getTime() - new Date(a.updatedAt || a.receivedAt).getTime()
                );
                const finalizedList = ensureReceiptIndexes(mergedList);
                saveStoredReceipts(finalizedList);
                callback(finalizedList);
                return;
            }
        } catch {}
        callback(localItems);
    };

    load();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedLoad = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            load();
        }, 3000);
    };

    const channel = supabase.channel(`goods_receipts_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'goods_receipts' }, debouncedLoad)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'goods_receipt_items' }, debouncedLoad)
        .subscribe();

    return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        removeReceiptListener(callback);
        supabase.removeChannel(channel);
    };
};
