import { supabase } from '@/pages/utils/supabaseConfig';
import { PurchaseItem } from '../types/purchase.type';
import { saveInventoryMove } from './inventoryService';
import { getNextGoodsReceiptIndex } from './goodsReceiptCode';

export type GoodsReceiptStatus = 'draft' | 'received' | 'estornado';

export type GoodsReceipt = {
    id: string;
    receiptIndex?: number;
    purchaseId?: string;
    supplierId?: string;
    supplierName: string;
    receivedAt: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    items: PurchaseItem[];
    totalValue: number;
    observation?: string;
    fiscalKey?: string;
    attachments?: string[];
    status: GoodsReceiptStatus;
    isDraft: boolean;
    ipiPercent?: number;
    freightPercent?: number;
    createdAt?: string;
    updatedAt?: string;
};

const STORAGE_KEY = 'morantehub_goods_receipts_v1';

const getStoredReceipts = (): GoodsReceipt[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveStoredReceipts = (items: GoodsReceipt[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('Erro ao salvar recebimentos localmente:', e);
    }
};

let listeners: Array<(receipts: GoodsReceipt[]) => void> = [];

const notifyListeners = (receiptsList?: GoodsReceipt[]) => {
    const list = receiptsList || getStoredReceipts();
    listeners.forEach((cb) => {
        try { cb([...list]); } catch (e) { console.error(e); }
    });
};

const map = (row: any): GoodsReceipt => ({
    id: String(row.id),
    receiptIndex: Number(row.receipt_index) || undefined,
    purchaseId: row.purchase_id || undefined,
    supplierId: row.supplier_id || undefined,
    supplierName: row.supplier_name || 'Fornecedor',
    receivedAt: row.received_at || new Date().toISOString(),
    invoiceNumber: row.invoice_number || undefined,
    invoiceDate: row.invoice_date || undefined,
    items: row.items || [],
    totalValue: Number(row.total_value || 0),
    observation: row.observation || '',
    fiscalKey: row.fiscal_key || undefined,
    attachments: row.attachments || [],
    status: row.status === 'estornado' ? 'estornado' : (row.status === 'received' ? 'received' : 'draft'),
    isDraft: row.is_draft ?? (row.status !== 'received' && row.status !== 'estornado'),
    ipiPercent: Number(row.ipi_percent || 0),
    freightPercent: Number(row.freight_percent || 0),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
});

// Auto-salva ou atualiza um rascunho de recebimento
export const saveGoodsReceiptDraft = async (draftData: Partial<GoodsReceipt>): Promise<GoodsReceipt> => {
    const localList = getStoredReceipts();
    const id = draftData.id || `rcpt_draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
        await supabase.from('goods_receipts').upsert({
            id: draftReceipt.id,
            receipt_index: draftReceipt.receiptIndex,
            purchase_id: draftReceipt.purchaseId || null,
            supplier_id: draftReceipt.supplierId || null,
            supplier_name: draftReceipt.supplierName,
            received_at: draftReceipt.receivedAt,
            invoice_number: draftReceipt.invoiceNumber || null,
            invoice_date: draftReceipt.invoiceDate || null,
            items: draftReceipt.items,
            total_value: draftReceipt.totalValue,
            observation: draftReceipt.observation || '',
            fiscal_key: draftReceipt.fiscalKey || null,
            attachments: draftReceipt.attachments || [],
            status: 'draft',
            is_draft: true,
            ipi_percent: draftReceipt.ipiPercent,
            freight_percent: draftReceipt.freightPercent,
            updated_at: now,
        });
    } catch {}

    return draftReceipt;
};

// Finaliza o recebimento: muda status para 'received', lança as entradas no estoque
export const finalizeGoodsReceipt = async (receipt: GoodsReceipt): Promise<void> => {
    const now = new Date().toISOString();
    const finalizedReceipt: GoodsReceipt = {
        ...receipt,
        status: 'received',
        isDraft: false,
        updatedAt: now,
    };

    // 1. Processar entradas no estoque para cada item recebido
    for (const item of finalizedReceipt.items) {
        if (!item.productId) continue;
        try {
            await saveInventoryMove({
                productId: item.productId,
                variationId: item.variationId,
                type: 'entry',
                quantity: Number(item.quantity || 0),
                date: finalizedReceipt.receivedAt || now,
                label: finalizedReceipt.invoiceNumber 
                    ? `Recebimento NF-${finalizedReceipt.invoiceNumber}` 
                    : `Recebimento de Mercadorias (${finalizedReceipt.supplierName})`,
                observation: finalizedReceipt.observation || `Recebimento de ${item.description || 'mercadoria'} - Fornecedor: ${finalizedReceipt.supplierName}`,
            }, 0);
        } catch (err) {
            console.error('Erro ao registrar lançamento de estoque do item recebido:', item, err);
        }
    }

    // 2. Atualizar localmente
    const localList = getStoredReceipts();
    const idx = localList.findIndex((item) => item.id === finalizedReceipt.id);
    if (idx !== -1) {
        localList[idx] = finalizedReceipt;
    } else {
        localList.unshift(finalizedReceipt);
    }
    saveStoredReceipts(localList);
    notifyListeners(localList);

    // 3. Tentar persistir no Supabase se a tabela existir
    try {
        await supabase.from('goods_receipts').upsert({
            id: finalizedReceipt.id,
            receipt_index: finalizedReceipt.receiptIndex,
            purchase_id: finalizedReceipt.purchaseId || null,
            supplier_id: finalizedReceipt.supplierId || null,
            supplier_name: finalizedReceipt.supplierName,
            received_at: finalizedReceipt.receivedAt,
            invoice_number: finalizedReceipt.invoiceNumber || null,
            invoice_date: finalizedReceipt.invoiceDate || null,
            items: finalizedReceipt.items,
            total_value: finalizedReceipt.totalValue,
            observation: finalizedReceipt.observation || '',
            fiscal_key: finalizedReceipt.fiscalKey || null,
            attachments: finalizedReceipt.attachments || [],
            status: 'received',
            is_draft: false,
            ipi_percent: finalizedReceipt.ipiPercent,
            freight_percent: finalizedReceipt.freightPercent,
            updated_at: now,
        });
    } catch {}
};

// Estorna o recebimento: muda status para 'estornado', desfaz o lançamento de estoque
export const reverseGoodsReceipt = async (id: string): Promise<GoodsReceipt> => {
    const localList = getStoredReceipts();
    const idx = localList.findIndex((item) => item.id === id);
    if (idx === -1) throw new Error('Recebimento não encontrado.');

    const receipt = localList[idx];
    if (receipt.status === 'estornado') return receipt;

    const now = new Date().toISOString();
    const estornadoReceipt: GoodsReceipt = {
        ...receipt,
        status: 'estornado',
        isDraft: false,
        updatedAt: now,
    };

    // 1. Reverter estoque de cada item (lançamento de saída/estorno)
    for (const item of receipt.items) {
        if (!item.productId) continue;
        try {
            await saveInventoryMove({
                productId: item.productId,
                variationId: item.variationId,
                type: 'exit',
                quantity: Number(item.quantity || 0),
                date: now,
                label: receipt.invoiceNumber 
                    ? `Estorno Recebimento NF-${receipt.invoiceNumber}` 
                    : `Estorno Recebimento (${receipt.supplierName})`,
                observation: `Estorno de recebimento de ${item.description || 'mercadoria'} - Fornecedor: ${receipt.supplierName}`,
            }, 0);
        } catch (err) {
            console.error('Erro ao registrar estorno de estoque do item:', item, err);
        }
    }

    // 2. Atualizar localmente
    localList[idx] = estornadoReceipt;
    saveStoredReceipts(localList);
    notifyListeners(localList);

    // 3. Persistir no Supabase
    try {
        await supabase.from('goods_receipts').upsert({
            id: estornadoReceipt.id,
            receipt_index: estornadoReceipt.receiptIndex,
            purchase_id: estornadoReceipt.purchaseId || null,
            supplier_id: estornadoReceipt.supplierId || null,
            supplier_name: estornadoReceipt.supplierName,
            received_at: estornadoReceipt.receivedAt,
            invoice_number: estornadoReceipt.invoiceNumber || null,
            invoice_date: estornadoReceipt.invoiceDate || null,
            items: estornadoReceipt.items,
            total_value: estornadoReceipt.totalValue,
            observation: estornadoReceipt.observation || '',
            fiscal_key: estornadoReceipt.fiscalKey || null,
            attachments: estornadoReceipt.attachments || [],
            status: 'estornado',
            is_draft: false,
            ipi_percent: estornadoReceipt.ipiPercent,
            freight_percent: estornadoReceipt.freightPercent,
            updated_at: now,
        });
    } catch {}

    return estornadoReceipt;
};

export const deleteGoodsReceipt = async (id: string): Promise<void> => {
    const localList = getStoredReceipts().filter((item) => item.id !== id);
    saveStoredReceipts(localList);
    notifyListeners(localList);
    try {
        await supabase.from('goods_receipts').delete().eq('id', id);
    } catch {}
};

export const subscribeToGoodsReceipts = (callback: (items: GoodsReceipt[]) => void) => {
    listeners.push(callback);

    const load = async () => {
        const localItems = getStoredReceipts();
        try {
            const { data, error } = await supabase.from('goods_receipts').select('*').order('updated_at', { ascending: false });
            if (!error && data?.length) {
                const dbItems = data.map(map);
                const mergedMap = new Map<string, GoodsReceipt>();
                localItems.forEach((item) => mergedMap.set(item.id, item));
                dbItems.forEach((item) => mergedMap.set(item.id, item));
                const mergedList = Array.from(mergedMap.values()).sort((a, b) => new Date(b.updatedAt || b.receivedAt).getTime() - new Date(a.updatedAt || a.receivedAt).getTime());
                saveStoredReceipts(mergedList);
                callback(mergedList);
                return;
            }
        } catch {}
        callback(localItems);
    };

    load();

    const channel = supabase.channel(`goods_receipts_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'goods_receipts' }, load)
        .subscribe();

    return () => {
        listeners = listeners.filter((cb) => cb !== callback);
        supabase.removeChannel(channel);
    };
};
