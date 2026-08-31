import { supabase } from './supabaseConfig';

const MAX_RECEIPT_CODE = 999999;

export const formatGoodsReceiptCode = (receipt?: { receiptIndex?: number | null }): string => {
    const code = Number(receipt?.receiptIndex);
    return Number.isInteger(code) && code > 0 && code <= MAX_RECEIPT_CODE
        ? String(code).padStart(6, '0')
        : '—';
};

export const getNextGoodsReceiptIndex = async (localReceipts: Array<{ receiptIndex?: number | null }>): Promise<number> => {
    const { data: sequenceValue, error: sequenceError } = await supabase.rpc('next_goods_receipt_index');
    const code = Number(sequenceValue);
    if (!sequenceError && Number.isInteger(code) && code > 0 && code <= MAX_RECEIPT_CODE) return code;

    const localMax = localReceipts.reduce((highest, receipt) => Math.max(highest, Number(receipt.receiptIndex) || 0), 0);
    const { data } = await supabase.from('goods_receipts').select('receipt_index');
    const databaseMax = (data || []).reduce((highest, receipt: any) => Math.max(highest, Number(receipt.receipt_index) || 0), 0);
    const nextCode = Math.max(localMax, databaseMax) + 1;
    if (nextCode > MAX_RECEIPT_CODE) throw new Error('O limite de 999999 códigos de recebimento foi atingido.');
    return nextCode;
};
