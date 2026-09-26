import { supabase } from '@/pages/utils/supabaseConfig';
import { GoodsReceipt } from './goodsReceipt.types';
import { getStoredReceipts, saveStoredReceipts, notifyListeners } from './goodsReceiptStorage';

export const reverseGoodsReceipt = async (id: string): Promise<GoodsReceipt> => {
    const localList = getStoredReceipts();
    const idx = localList.findIndex((item) => item.id === id);
    if (idx === -1) throw new Error('Recebimento não encontrado.');

    const receipt = localList[idx];
    if (receipt.status === 'estornado') return receipt;

    const now = new Date().toISOString();
    const estornadoReceipt: GoodsReceipt = {
        ...receipt,
        receiptIndex: receipt.receiptIndex,
        status: 'estornado',
        isDraft: false,
        updatedAt: now,
    };

    const { error } = await supabase.rpc('set_goods_receipt_inventory_status_checked_transaction', {
        p_receipt_id: receipt.id,
        p_status: 'estornado',
        p_reason: `Estorno do Recebimento #${receipt.receiptIndex || receipt.id}`,
    });
    if (error) throw error;

    // 2. Atualizar localmente
    localList[idx] = estornadoReceipt;
    saveStoredReceipts(localList);
    notifyListeners(localList);

    return estornadoReceipt;
};

export const unreverseGoodsReceipt = async (id: string): Promise<GoodsReceipt> => {
    const localList = getStoredReceipts();
    const idx = localList.findIndex((item) => item.id === id);
    if (idx === -1) throw new Error('Recebimento não encontrado.');

    const receipt = localList[idx];
    if (receipt.status !== 'estornado') return receipt;

    const now = new Date().toISOString();
    const reactivatedReceipt: GoodsReceipt = {
        ...receipt,
        status: 'received',
        isDraft: false,
        updatedAt: now,
    };

    const { error } = await supabase.rpc('set_goods_receipt_inventory_status_checked_transaction', {
        p_receipt_id: receipt.id,
        p_status: 'received',
        p_reason: null,
    });
    if (error) throw error;

    // 2. Atualizar localmente
    localList[idx] = reactivatedReceipt;
    saveStoredReceipts(localList);
    notifyListeners(localList);

    return reactivatedReceipt;
};
