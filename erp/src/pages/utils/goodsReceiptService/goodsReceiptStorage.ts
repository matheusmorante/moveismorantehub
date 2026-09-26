import { GoodsReceipt } from './goodsReceipt.types';
import { supabase } from '@/pages/utils/supabaseConfig';

const STORAGE_KEY = 'morantehub_goods_receipts_v1';

export const getStoredReceipts = (): GoodsReceipt[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveStoredReceipts = (items: GoodsReceipt[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('Erro ao salvar recebimentos localmente:', e);
    }
};

let listeners: Array<(receipts: GoodsReceipt[]) => void> = [];

export const notifyListeners = (receiptsList?: GoodsReceipt[]) => {
    const list = receiptsList || getStoredReceipts();
    listeners.forEach((cb) => {
        try { cb([...list]); } catch (e) { console.error(e); }
    });
};

export const addReceiptListener = (callback: (receipts: GoodsReceipt[]) => void) => {
    listeners.push(callback);
};

export const removeReceiptListener = (callback: (receipts: GoodsReceipt[]) => void) => {
    listeners = listeners.filter((cb) => cb !== callback);
};

const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

/**
 * Garante que todos os recebimentos possuam um receiptIndex válido sequencial.
 * Atua como auto-cura transparente para registros legados ou criados sem código.
 */
export const ensureReceiptIndexes = (items: GoodsReceipt[]): GoodsReceipt[] => {
    let needsSave = false;
    let highest = items.reduce((max, item) => Math.max(max, Number(item.receiptIndex) || 0), 0);

    const list = [...items].sort((a, b) => new Date(a.createdAt || a.receivedAt).getTime() - new Date(b.createdAt || b.receivedAt).getTime());

    list.forEach((item) => {
        if (!item.receiptIndex || item.receiptIndex <= 0) {
            highest += 1;
            item.receiptIndex = highest;
            needsSave = true;
            try {
                if (isValidUuid(item.id)) {
                    supabase.from('goods_receipts')
                        .update({ receipt_index: highest })
                        .eq('id', item.id)
                        .then(() => {});
                }
            } catch  { /* no-op: intencionalmente silencioso */ }
        }
    });

    const result = list.sort((a, b) => new Date(b.updatedAt || b.receivedAt).getTime() - new Date(a.updatedAt || a.receivedAt).getTime());
    if (needsSave) {
        saveStoredReceipts(result);
    }
    return result;
};
