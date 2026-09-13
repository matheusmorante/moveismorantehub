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
    // Dados não fiscais
    nonFiscalDiscountMode?: 'percent' | 'fixed';
    nonFiscalDiscountValue?: number;
    nonFiscalFreightMode?: 'percent' | 'fixed';
    nonFiscalFreightValue?: number;
    nonFiscalOtherExpensesMode?: 'percent' | 'fixed';
    nonFiscalOtherExpensesValue?: number;
    // Dados fiscais espelhados
    fiscalIpi?: number;
    fiscalFreight?: number;
    fiscalDiscount?: number;
    fiscalOtherExpenses?: number;
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

const isValidUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

const syncGoodsReceiptItems = async (receiptId: string, items: PurchaseItem[]) => {
    if (!isValidUuid(receiptId)) return;
    try {
        await supabase.from('goods_receipt_items').delete().eq('receipt_id', receiptId);
        if (items && items.length > 0) {
            const rows = items.map((item, index) => ({
                receipt_id: receiptId,
                item_index: index + 1,
                product_id: isValidUuid(item.productId) ? item.productId : null,
                variation_id: isValidUuid(item.variationId) ? item.variationId : null,
                description: item.description || 'Item de Recebimento',
                quantity: Number(item.quantity || 1),
                base_cost: Number(item.baseCost || 0),
                unit_cost: Number(item.unitCost || 0),
                freight_fiscal_unit: Number(item.freightFiscalUnit || 0),
                freight_non_fiscal_unit: Number(item.freightNonFiscalUnit || 0),
                discount_unit: Number(item.discountUnit || 0),
                other_expenses_fiscal_unit: Number(item.otherExpensesFiscalUnit || 0),
                other_expenses_non_fiscal_unit: Number(item.otherExpensesNonFiscalUnit || 0),
                additional_cost_unit: Number(item.additionalCostUnit || 0),
                item_snapshot: item,
            }));
            await supabase.from('goods_receipt_items').insert(rows);
        }
    } catch (err) {
        console.error('[GoodsReceipt] Falha ao sincronizar goods_receipt_items:', err);
    }
};

const map = (row: any): GoodsReceipt => {
    const rawItems: PurchaseItem[] = Array.isArray(row.goods_receipt_items) && row.goods_receipt_items.length > 0
        ? row.goods_receipt_items
            .sort((a: any, b: any) => (a.item_index || 0) - (b.item_index || 0))
            .map((gri: any) => ({
                productId: gri.product_id || gri.item_snapshot?.productId || '',
                variationId: gri.variation_id || gri.item_snapshot?.variationId || undefined,
                description: gri.description || gri.item_snapshot?.description || '',
                quantity: Number(gri.quantity || 1),
                baseCost: Number(gri.base_cost || 0),
                unitCost: Number(gri.unit_cost || 0),
                freightFiscalUnit: Number(gri.freight_fiscal_unit || 0),
                freightNonFiscalUnit: Number(gri.freight_non_fiscal_unit || 0),
                discountUnit: Number(gri.discount_unit || 0),
                otherExpensesFiscalUnit: Number(gri.other_expenses_fiscal_unit || 0),
                otherExpensesNonFiscalUnit: Number(gri.other_expenses_non_fiscal_unit || 0),
                additionalCostUnit: Number(gri.additional_cost_unit || 0),
            }))
        : (row.items || []);

    return {
        id: String(row.id),
        receiptIndex: Number(row.receipt_index) || undefined,
        purchaseId: row.purchase_id || undefined,
        supplierId: row.supplier_id || undefined,
        supplierName: row.supplier_name || 'Fornecedor',
        receivedAt: row.received_at || new Date().toISOString(),
        invoiceNumber: row.invoice_number || undefined,
        invoiceDate: row.invoice_date || undefined,
        items: rawItems,
        totalValue: Number(row.total_value || 0),
        observation: row.observation || '',
        fiscalKey: row.fiscal_key || undefined,
        attachments: row.attachments || [],
        status: row.status === 'estornado' ? 'estornado' : (row.status === 'received' ? 'received' : 'draft'),
        isDraft: row.is_draft ?? (row.status !== 'received' && row.status !== 'estornado'),
        ipiPercent: Number(row.ipi_percent || 0),
        freightPercent: Number(row.freight_percent || 0),
        nonFiscalDiscountMode: row.non_fiscal_discount_mode || undefined,
        nonFiscalDiscountValue: typeof row.non_fiscal_discount_value === 'number' ? row.non_fiscal_discount_value : undefined,
        nonFiscalFreightMode: row.non_fiscal_freight_mode || undefined,
        nonFiscalFreightValue: typeof row.non_fiscal_freight_value === 'number' ? row.non_fiscal_freight_value : undefined,
        nonFiscalOtherExpensesMode: row.non_fiscal_other_expenses_mode || undefined,
        nonFiscalOtherExpensesValue: typeof row.non_fiscal_other_expenses_value === 'number' ? row.non_fiscal_other_expenses_value : undefined,
        fiscalIpi: typeof row.fiscal_ipi === 'number' ? row.fiscal_ipi : undefined,
        fiscalFreight: typeof row.fiscal_freight === 'number' ? row.fiscal_freight : undefined,
        fiscalDiscount: typeof row.fiscal_discount === 'number' ? row.fiscal_discount : undefined,
        fiscalOtherExpenses: typeof row.fiscal_other_expenses === 'number' ? row.fiscal_other_expenses : undefined,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
    };
};

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
        await supabase.from('goods_receipts').upsert({
            id: draftReceipt.id,
            receipt_index: draftReceipt.receiptIndex,
            purchase_id: isValidUuid(draftReceipt.purchaseId) ? draftReceipt.purchaseId : null,
            supplier_id: isValidUuid(draftReceipt.supplierId) ? draftReceipt.supplierId : null,
            supplier_name: draftReceipt.supplierName,
            received_at: draftReceipt.receivedAt,
            invoice_number: draftReceipt.invoiceNumber || null,
            invoice_date: draftReceipt.invoiceDate || null,
            total_value: draftReceipt.totalValue,
            observation: draftReceipt.observation || '',
            fiscal_key: draftReceipt.fiscalKey || null,
            attachments: draftReceipt.attachments || [],
            status: 'draft',
            is_draft: true,
            ipi_percent: draftReceipt.ipiPercent,
            freight_percent: draftReceipt.freightPercent,
            non_fiscal_discount_mode: draftReceipt.nonFiscalDiscountMode || null,
            non_fiscal_discount_value: draftReceipt.nonFiscalDiscountValue ?? 0,
            non_fiscal_freight_mode: draftReceipt.nonFiscalFreightMode || null,
            non_fiscal_freight_value: draftReceipt.nonFiscalFreightValue ?? 0,
            non_fiscal_other_expenses_mode: draftReceipt.nonFiscalOtherExpensesMode || null,
            non_fiscal_other_expenses_value: draftReceipt.nonFiscalOtherExpensesValue ?? 0,
            fiscal_ipi: draftReceipt.fiscalIpi ?? 0,
            fiscal_freight: draftReceipt.fiscalFreight ?? 0,
            fiscal_discount: draftReceipt.fiscalDiscount ?? 0,
            fiscal_other_expenses: draftReceipt.fiscalOtherExpenses ?? 0,
            updated_at: now,
        });

        await syncGoodsReceiptItems(draftReceipt.id, draftReceipt.items);
    } catch {}

    return draftReceipt;
};

// Finaliza o recebimento: muda status para 'received', lança as entradas no estoque
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

    // 1. Processar entradas no estoque para cada item recebido
    const failedItems: string[] = [];
    for (const item of finalizedReceipt.items) {
        if (!item.productId) continue;
        try {
            await saveInventoryMove({
                productId: item.productId,
                variationId: item.variationId,
                productDescription: item.description || 'Mercadoria recebida',
                type: 'entry',
                quantity: Number(item.quantity || 0),
                unitCost: Number(item.unitCost || 0) || undefined,
                date: finalizedReceipt.receivedAt || now,
                label: finalizedReceipt.invoiceNumber 
                    ? `Recebimento NF-${finalizedReceipt.invoiceNumber}` 
                    : `Recebimento de Mercadorias (${finalizedReceipt.supplierName})`,
                observation: finalizedReceipt.observation || `Recebimento de ${item.description || 'mercadoria'} - Fornecedor: ${finalizedReceipt.supplierName}`,
            }, 0);
        } catch (err) {
            console.error('[Recebimento] Falha ao lançar estoque do item:', item.description, err);
            failedItems.push(item.description || item.productId);
        }
    }
    if (failedItems.length > 0) {
        console.warn(`[Recebimento #${receiptIndex}] ${failedItems.length} item(ns) não foram lançados no estoque: ${failedItems.join(', ')}. Verifique o inventário manualmente.`);
    }

    // 2. Atualizar localmente
    if (existingIndex !== -1) {
        localList[existingIndex] = finalizedReceipt;
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
            purchase_id: isValidUuid(finalizedReceipt.purchaseId) ? finalizedReceipt.purchaseId : null,
            supplier_id: isValidUuid(finalizedReceipt.supplierId) ? finalizedReceipt.supplierId : null,
            supplier_name: finalizedReceipt.supplierName,
            received_at: finalizedReceipt.receivedAt,
            invoice_number: finalizedReceipt.invoiceNumber || null,
            invoice_date: finalizedReceipt.invoiceDate || null,
            total_value: finalizedReceipt.totalValue,
            observation: finalizedReceipt.observation || '',
            fiscal_key: finalizedReceipt.fiscalKey || null,
            attachments: finalizedReceipt.attachments || [],
            status: 'received',
            is_draft: false,
            ipi_percent: finalizedReceipt.ipiPercent,
            freight_percent: finalizedReceipt.freightPercent,
            non_fiscal_discount_mode: finalizedReceipt.nonFiscalDiscountMode || null,
            non_fiscal_discount_value: finalizedReceipt.nonFiscalDiscountValue ?? 0,
            non_fiscal_freight_mode: finalizedReceipt.nonFiscalFreightMode || null,
            non_fiscal_freight_value: finalizedReceipt.nonFiscalFreightValue ?? 0,
            non_fiscal_other_expenses_mode: finalizedReceipt.nonFiscalOtherExpensesMode || null,
            non_fiscal_other_expenses_value: finalizedReceipt.nonFiscalOtherExpensesValue ?? 0,
            fiscal_ipi: finalizedReceipt.fiscalIpi ?? 0,
            fiscal_freight: finalizedReceipt.fiscalFreight ?? 0,
            fiscal_discount: finalizedReceipt.fiscalDiscount ?? 0,
            fiscal_other_expenses: finalizedReceipt.fiscalOtherExpenses ?? 0,
            updated_at: now,
        });

        await syncGoodsReceiptItems(finalizedReceipt.id, finalizedReceipt.items);
    } catch (err) {
        console.error('[Recebimento] Falha ao persistir no Supabase:', err);
    }
};

// Hierarquia de status para merge: draft < received < estornado
const STATUS_RANK: Record<GoodsReceiptStatus, number> = { draft: 0, received: 1, estornado: 2 };

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
        receiptIndex: receipt.receiptIndex,
        status: 'estornado',
        isDraft: false,
        updatedAt: now,
    };

    // 1. Reverter estoque de cada item (lançamento de saída/estorno)
    const failedItems: string[] = [];
    for (const item of receipt.items) {
        if (!item.productId) continue;
        try {
            await saveInventoryMove({
                productId: item.productId,
                variationId: item.variationId,
                productDescription: item.description || 'Mercadoria estornada',
                type: 'exit',
                quantity: Number(item.quantity || 0),
                date: now,
                label: receipt.invoiceNumber 
                    ? `Estorno Recebimento NF-${receipt.invoiceNumber}` 
                    : `Estorno Recebimento (${receipt.supplierName})`,
                observation: `Estorno de recebimento de ${item.description || 'mercadoria'} - Fornecedor: ${receipt.supplierName}`,
            }, 0);
        } catch (err) {
            console.error('[Estorno] Falha ao reverter estoque do item:', item.description, err);
            failedItems.push(item.description || item.productId);
        }
    }
    if (failedItems.length > 0) {
        console.warn(`[Estorno #${receipt.receiptIndex}] ${failedItems.length} item(ns) não foram revertidos no estoque: ${failedItems.join(', ')}. Verifique o inventário manualmente.`);
    }

    // 2. Atualizar localmente
    localList[idx] = estornadoReceipt;
    saveStoredReceipts(localList);
    notifyListeners(localList);

    // 3. Persistir no Supabase com todos os campos fiscais
    try {
        await supabase.from('goods_receipts').upsert({
            id: estornadoReceipt.id,
            receipt_index: estornadoReceipt.receiptIndex,
            purchase_id: isValidUuid(estornadoReceipt.purchaseId) ? estornadoReceipt.purchaseId : null,
            supplier_id: isValidUuid(estornadoReceipt.supplierId) ? estornadoReceipt.supplierId : null,
            supplier_name: estornadoReceipt.supplierName,
            received_at: estornadoReceipt.receivedAt,
            invoice_number: estornadoReceipt.invoiceNumber || null,
            invoice_date: estornadoReceipt.invoiceDate || null,
            total_value: estornadoReceipt.totalValue,
            observation: estornadoReceipt.observation || '',
            fiscal_key: estornadoReceipt.fiscalKey || null,
            attachments: estornadoReceipt.attachments || [],
            status: 'estornado',
            is_draft: false,
            ipi_percent: estornadoReceipt.ipiPercent,
            freight_percent: estornadoReceipt.freightPercent,
            non_fiscal_discount_mode: estornadoReceipt.nonFiscalDiscountMode || null,
            non_fiscal_discount_value: estornadoReceipt.nonFiscalDiscountValue ?? 0,
            non_fiscal_freight_mode: estornadoReceipt.nonFiscalFreightMode || null,
            non_fiscal_freight_value: estornadoReceipt.nonFiscalFreightValue ?? 0,
            non_fiscal_other_expenses_mode: estornadoReceipt.nonFiscalOtherExpensesMode || null,
            non_fiscal_other_expenses_value: estornadoReceipt.nonFiscalOtherExpensesValue ?? 0,
            fiscal_ipi: estornadoReceipt.fiscalIpi ?? 0,
            fiscal_freight: estornadoReceipt.fiscalFreight ?? 0,
            fiscal_discount: estornadoReceipt.fiscalDiscount ?? 0,
            fiscal_other_expenses: estornadoReceipt.fiscalOtherExpenses ?? 0,
            updated_at: now,
        });

        await syncGoodsReceiptItems(estornadoReceipt.id, estornadoReceipt.items);
    } catch (err) {
        console.error('[Estorno] Falha ao persistir no Supabase:', err);
    }

    return estornadoReceipt;
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

export const saveGoodsReceipt = async (data: Partial<GoodsReceipt>): Promise<GoodsReceipt> => {
    const localList = getStoredReceipts();
    const id = data.id || `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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

/**
 * Garante que todos os recebimentos possuam um receiptIndex válido sequencial.
 * Atua como auto-cura transparente para registros legados ou criados sem código.
 */
const ensureReceiptIndexes = (items: GoodsReceipt[]): GoodsReceipt[] => {
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
            } catch {}
        }
    });

    const result = list.sort((a, b) => new Date(b.updatedAt || b.receivedAt).getTime() - new Date(a.updatedAt || a.receivedAt).getTime());
    if (needsSave) {
        saveStoredReceipts(result);
    }
    return result;
};

export interface FetchGoodsReceiptsOptions {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    status?: GoodsReceiptStatus;
}

export interface FetchGoodsReceiptsResult {
    items: GoodsReceipt[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

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

    const items = (data || []).map(map);
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return { items, totalCount, page, pageSize, totalPages };
};

export const subscribeToGoodsReceipts = (callback: (items: GoodsReceipt[]) => void) => {
    listeners.push(callback);

    const load = async () => {
        const localItems = ensureReceiptIndexes(getStoredReceipts());
        try {
            const { data, error } = await supabase
                .from('goods_receipts')
                .select('*, goods_receipt_items(*)')
                .order('updated_at', { ascending: false })
                .limit(30);
            if (!error && data?.length) {
                const dbItems = data.map(map);
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
                const mergedList = Array.from(mergedMap.values()).sort((a, b) => new Date(b.updatedAt || b.receivedAt).getTime() - new Date(a.updatedAt || a.receivedAt).getTime());
                const finalizedList = ensureReceiptIndexes(mergedList);
                saveStoredReceipts(finalizedList);
                callback(finalizedList);
                return;
            }
        } catch {}
        callback(localItems);
    };

    load();

    const channel = supabase.channel(`goods_receipts_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'goods_receipts' }, load)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'goods_receipt_items' }, load)
        .subscribe();

    return () => {
        listeners = listeners.filter((cb) => cb !== callback);
        supabase.removeChannel(channel);
    };
};


