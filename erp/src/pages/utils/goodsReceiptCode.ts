import { supabase } from './supabaseConfig';

const MAX_RECEIPT_CODE = 999999;

export const getGoodsReceiptIndex = (receipt?: { receiptIndex?: number | null } | Record<string, any>): number | null => {
    if (!receipt) return null;
    const raw = receipt.receiptIndex ?? (receipt as any).receipt_index;
    const code = Number(raw);
    return Number.isInteger(code) && code > 0 && code <= MAX_RECEIPT_CODE ? code : null;
};

export const formatGoodsReceiptCode = (receipt?: { receiptIndex?: number | null } | Record<string, any>): string => {
    const code = getGoodsReceiptIndex(receipt);
    return code ? String(code).padStart(6, '0') : '—';
};

export const getNextGoodsReceiptIndex = async (localReceipts: Array<{ receiptIndex?: number | null } | Record<string, any>>): Promise<number> => {
    try {
        const { data: sequenceValue, error: sequenceError } = await supabase.rpc('next_goods_receipt_index');
        const code = Number(sequenceValue);
        if (!sequenceError && Number.isInteger(code) && code > 0 && code <= MAX_RECEIPT_CODE) return code;
    } catch {}

    const localMax = (localReceipts || []).reduce((highest, receipt) => {
        const idx = getGoodsReceiptIndex(receipt);
        return Math.max(highest, idx || 0);
    }, 0);

    try {
        const { data } = await supabase.from('goods_receipts').select('receipt_index');
        const databaseMax = (data || []).reduce((highest, receipt: any) => {
            const idx = Number(receipt?.receipt_index);
            return Math.max(highest, Number.isInteger(idx) ? idx : 0);
        }, 0);
        const nextCode = Math.max(localMax, databaseMax) + 1;
        if (nextCode > MAX_RECEIPT_CODE) throw new Error('O limite de 999999 códigos de recebimento foi atingido.');
        return nextCode;
    } catch {
        const nextCode = localMax + 1;
        return nextCode > 0 ? nextCode : 1;
    }
};
