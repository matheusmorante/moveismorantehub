import { supabase } from '@/pages/utils/supabaseConfig';
import { GoodsReceipt } from './goodsReceipt.types';
import { getStoredReceipts, saveStoredReceipts, notifyListeners } from './goodsReceiptStorage';
import { buildGoodsReceiptDbPayload, isValidUuid } from './goodsReceiptMapper';
import { syncGoodsReceiptItems } from './goodsReceiptItemsSync';
import { getNextGoodsReceiptIndex } from '../goodsReceiptCode';
import { reprocessMovingAverageCosts } from '../movingAverageCostService';

export const saveGoodsReceiptDraft = async (draftData: Partial<GoodsReceipt>): Promise<GoodsReceipt> => {
    const localList = getStoredReceipts();
    const id = draftData.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const existingIndex = localList.findIndex((item) => item.id === id);
    const existing = existingIndex !== -1 ? localList[existingIndex] : null;

    const draftReceipt: GoodsReceipt = {
        id,
        receiptIndex: draftData.receiptIndex || existing?.receiptIndex || await getNextGoodsReceiptIndex(localList),
        purchaseId: draftData.purchaseId || existing?.purchaseId,
        supplierId: draftData.supplierId || existing?.supplierId,
        supplierName: draftData.supplierName || existing?.supplierName || 'Fornecedor',
        receivedAt: draftData.receivedAt || existing?.receivedAt || now,
        invoiceNumber: draftData.invoiceNumber ?? existing?.invoiceNumber,
        invoiceDate: draftData.invoiceDate ?? existing?.invoiceDate,
        items: draftData.items || existing?.items || [],
        totalValue: draftData.totalValue ?? existing?.totalValue ?? 0,
        observation: draftData.observation ?? existing?.observation ?? '',
        fiscalKey: draftData.fiscalKey ?? existing?.fiscalKey,
        attachments: draftData.attachments || existing?.attachments || [],
        status: 'draft',
        isDraft: true,
        ipiPercent: draftData.ipiPercent ?? existing?.ipiPercent ?? 0,
        freightPercent: draftData.freightPercent ?? existing?.freightPercent ?? 0,
        nonFiscalDiscountMode: draftData.nonFiscalDiscountMode ?? existing?.nonFiscalDiscountMode,
        nonFiscalDiscountValue: draftData.nonFiscalDiscountValue ?? existing?.nonFiscalDiscountValue,
        nonFiscalFreightMode: draftData.nonFiscalFreightMode ?? existing?.nonFiscalFreightMode,
        nonFiscalFreightValue: draftData.nonFiscalFreightValue ?? existing?.nonFiscalFreightValue,
        nonFiscalOtherExpensesMode: draftData.nonFiscalOtherExpensesMode ?? existing?.nonFiscalOtherExpensesMode,
        nonFiscalOtherExpensesValue: draftData.nonFiscalOtherExpensesValue ?? existing?.nonFiscalOtherExpensesValue,
        fiscalIpi: draftData.fiscalIpi ?? existing?.fiscalIpi,
        fiscalFreight: draftData.fiscalFreight ?? existing?.fiscalFreight,
        fiscalDiscount: draftData.fiscalDiscount ?? existing?.fiscalDiscount,
        fiscalOtherExpenses: draftData.fiscalOtherExpenses ?? existing?.fiscalOtherExpenses,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
    };

    if (existingIndex !== -1) {
        localList[existingIndex] = draftReceipt;
    } else {
        localList.unshift(draftReceipt);
    }
    saveStoredReceipts(localList);
    notifyListeners(localList);

    try {
        await supabase.from('goods_receipts').upsert(buildGoodsReceiptDbPayload(draftReceipt, now));
        await syncGoodsReceiptItems(draftReceipt.id, draftReceipt.items);
    } catch {}

    return draftReceipt;
};

export const finalizeGoodsReceipt = async (receipt: GoodsReceipt): Promise<void> => {
    const localList = getStoredReceipts();
    const existingIndex = localList.findIndex((item) => item.id === receipt.id);
    const existing = existingIndex !== -1 ? localList[existingIndex] : null;

    const receiptIndex = receipt.receiptIndex || existing?.receiptIndex || await getNextGoodsReceiptIndex(localList);
    const now = new Date().toISOString();
    const finalizedReceipt: GoodsReceipt = {
        ...receipt,
        receiptIndex,
        status: 'received',
        isDraft: false,
        updatedAt: now,
    };

    // O banco grava cabeçalho, itens e entradas em uma única transação idempotente.
    // Nenhum estado local é publicado antes de o commit ser confirmado.
    const { data: transaction, error: transactionError } = await supabase.rpc('confirm_goods_receipt_transaction', {
        p_receipt: buildGoodsReceiptDbPayload(finalizedReceipt, now),
        p_items: finalizedReceipt.items,
    });
    if (transactionError) throw transactionError;
    const moveByItemIndex = new Map<number, string>(
        (transaction?.moves || []).map((move: { itemIndex: number; inventoryMoveId: string }) => [move.itemIndex, move.inventoryMoveId]),
    );
    finalizedReceipt.items = finalizedReceipt.items.map((item, index) => ({
        ...item,
        inventoryMoveId: moveByItemIndex.get(index + 1) || item.inventoryMoveId,
    }));
    // O saldo e o custo exibidos são projeções. Reconstituímos cada SKU depois
    // do commit, inclusive quando o recebimento tem data retroativa.
    const affectedSkus = new Map<string, { productId: string; variationId?: string }>();
    finalizedReceipt.items.forEach((item) => {
        if (item.productId) affectedSkus.set(`${item.productId}:${item.variationId || ''}`, item);
    });
    await Promise.all([...affectedSkus.values()].map((item) => reprocessMovingAverageCosts(item.productId, item.variationId)));

    // 2. Atualizar localmente
    if (existingIndex !== -1) {
        localList[existingIndex] = finalizedReceipt;
    } else {
        localList.unshift(finalizedReceipt);
    }
    saveStoredReceipts(localList);
    notifyListeners(localList);

};

export const saveGoodsReceipt = async (data: Partial<GoodsReceipt>): Promise<GoodsReceipt> => {
    const localList = getStoredReceipts();
    const id = data.id || crypto.randomUUID();
    const receiptIndex = data.receiptIndex || await getNextGoodsReceiptIndex(localList);
    const fullReceipt: GoodsReceipt = {
        id,
        receiptIndex,
        supplierName: data.supplierName || 'Fornecedor',
        receivedAt: data.receivedAt || new Date().toISOString(),
        items: data.items || [],
        totalValue: data.totalValue || 0,
        observation: data.observation || '',
        status: data.status || 'received',
        isDraft: data.isDraft ?? false,
        ...data,
    };
    await finalizeGoodsReceipt(fullReceipt);
    return fullReceipt;
};

export const deleteGoodsReceipt = async (id: string): Promise<void> => {
    const localList = getStoredReceipts().filter((item) => item.id !== id);
    saveStoredReceipts(localList);
    notifyListeners(localList);
    try {
        if (isValidUuid(id)) {
            await supabase.from('goods_receipt_items').delete().eq('receipt_id', id);
            await supabase.from('goods_receipts').delete().eq('id', id);
        }
    } catch {}
};
