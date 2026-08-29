import { supabase } from '@/pages/utils/supabaseConfig';
import Purchase from "../types/purchase.type";
import { saveInventoryMove, deleteInventoryMove } from '@/pages/utils/inventoryService';
import { getSettings } from '@/pages/utils/settingsService';
import { formatToBRDate } from '@/pages/utils/formatters';

const TABLE_NAME = "purchases";

let currentPurchases: Purchase[] = [];
let listeners: Array<(purchases: Purchase[]) => void> = [];

const notifyListeners = () => {
    listeners.forEach(listener => {
        try {
            listener([...currentPurchases]);
        } catch (e) {
            console.error("Erro ao notificar listener de compras:", e);
        }
    });
};

const assignPurchaseNumbers = (rawPurchases: any[]): Purchase[] => {
    // Ordena do mais antigo para o mais novo para atribuir números sequenciais 1, 2, 3...
    const sortedAsc = [...rawPurchases].sort((a, b) => {
        const timeA = new Date(a.created_at || a.date).getTime();
        const timeB = new Date(b.created_at || b.date).getTime();
        return timeA - timeB;
    });

    const mapped = sortedAsc.map((p, index) => mapFromDB(p, index + 1));

    // Retorna ordenado decrescente por data para a interface
    return mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const subscribeToPurchases = (callback: (purchases: Purchase[]) => void) => {
    listeners.push(callback);

    const fetchAll = () => {
        supabase.from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: true })
            .then((response: any) => {
                const { data, error } = response;
                if (data && !error) {
                    currentPurchases = assignPurchaseNumbers(data);
                    notifyListeners();
                } else if (error) {
                    console.error("Erro ao buscar compras iniciais:", error);
                    callback([]);
                }
            });
    };

    if (currentPurchases.length > 0) {
        callback([...currentPurchases]);
    }
    fetchAll();

    const channel = supabase.channel(`purchases_changes_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchAll();
        })
        .subscribe();

    return () => {
        listeners = listeners.filter(l => l !== callback);
        supabase.removeChannel(channel);
    };
};

const processInventoryMoves = async (purchase: Purchase, savedId: string) => {
    const formattedDate = formatToBRDate(purchase.date);
    const purchaseNum = purchase.purchaseNumber || 1;
    const moveLabel = purchase.invoiceNumber 
        ? `Entrada NF-${purchase.invoiceNumber}` 
        : `Entrada do Pedido #${purchaseNum} (${formattedDate})`;

    for (const item of purchase.items) {
        const { data: p } = await supabase.from('products').select('stock').eq('id', item.productId).single();
        const currentStockValue = p?.stock || 0;

        const qtyToMove = (item.receivedQuantity !== undefined) ? item.receivedQuantity : item.quantity;
        if (qtyToMove <= 0) continue;

        await saveInventoryMove({
            productId: item.productId,
            variationId: item.variationId,
            productDescription: item.description,
            type: 'entry',
            quantity: qtyToMove,
            date: new Date().toISOString(),
            label: moveLabel,
            relatedEntityId: savedId,
            relatedEntityType: 'purchase_order',
            observation: `Pedido de Compra #${purchaseNum}${purchase.invoiceNumber ? ` | NF: ${purchase.invoiceNumber}` : ''}${purchase.observation ? ` | ${purchase.observation}` : ''}`,
            unitCost: item.unitCost
        }, currentStockValue);
    }
    
    await supabase.from(TABLE_NAME).update({ stockProcessed: true }).eq('id', savedId);

    currentPurchases = currentPurchases.map(p => 
        p.id === savedId ? { ...p, stockProcessed: true } : p
    );
    notifyListeners();
};

export const reverseInventoryMoves = async (purchaseId: string) => {
    const searchPattern = `%${purchaseId}%`;
    const shortPattern = purchaseId.length >= 4 ? `%#${purchaseId.slice(-4)}%` : searchPattern;

    const { data: moves, error } = await supabase
        .from('inventory_moves')
        .select('id')
        .or(`order_id.eq.${purchaseId},observation.ilike.${searchPattern},label.ilike.${searchPattern},observation.ilike.${shortPattern}`);

    if (error) {
        console.error("Erro ao buscar lançamentos para estorno:", error);
        throw error;
    }

    if (moves && moves.length > 0) {
        for (const move of moves) {
            await deleteInventoryMove(move.id, true);
        }
    }

    await supabase.from(TABLE_NAME).update({ stockProcessed: false }).eq('id', purchaseId);

    currentPurchases = currentPurchases.map(p => 
        p.id === purchaseId ? { ...p, stockProcessed: false } : p
    );
    notifyListeners();
};

export const cancelPurchase = async (purchase: Purchase): Promise<void> => {
    if (!purchase.id) return;

    if (purchase.status === 'cancelled') {
        throw new Error("Este pedido de compra já está cancelado.");
    }

    const { error } = await supabase
        .from(TABLE_NAME)
        .update({ status: 'cancelled' })
        .eq('id', purchase.id);

    if (error) {
        console.error("Erro ao cancelar compra:", error);
        throw error;
    }

    currentPurchases = currentPurchases.map(p => 
        p.id === purchase.id ? { ...p, status: 'cancelled' } : p
    );
    notifyListeners();
};

export const toggleStockProcessing = async (purchase: Purchase): Promise<boolean> => {
    if (!purchase.id) return false;
    
    if (purchase.stockProcessed) {
        await reverseInventoryMoves(purchase.id);
        return false;
    }

    const { data: savedPurchase, error } = await supabase
        .from(TABLE_NAME)
        .select('stockProcessed')
        .eq('id', purchase.id)
        .single();
    if (error) throw error;
    if (savedPurchase?.stockProcessed) return true;

    await processInventoryMoves(purchase, purchase.id);
    return true;
};

export const savePurchase = async (purchase: Purchase): Promise<string | undefined> => {
    try {
        const nextNumber = currentPurchases.length + 1;
        const dbPayload = {
            ...mapToDB(purchase),
            purchase_number: nextNumber
        };
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([dbPayload])
            .select();

        if (error) throw error;
        const savedRecord = data?.[0];
        if (savedRecord) {
            const mapped = mapFromDB(savedRecord, nextNumber);
            currentPurchases = [mapped, ...currentPurchases];
            notifyListeners();
            return String(savedRecord.id);
        }
    } catch (error) {
        console.error("Erro ao salvar compra: ", error);
        throw error;
    }
};

export const updatePurchase = async (id: string, updates: Partial<Purchase>): Promise<void> => {
    try {
        const { data: existing } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
        if (!existing) throw new Error("Pedido não encontrado");

        const currentPurchase = mapFromDB(existing);
        const merged: Purchase = { ...currentPurchase, ...updates };

        const dbUpdates: any = {};
        if (updates.supplierId !== undefined) dbUpdates.supplier_id = updates.supplierId || null;
        if (updates.supplierName !== undefined) dbUpdates.supplier_name = updates.supplierName || null;
        if (updates.date !== undefined) dbUpdates.date = updates.date ? new Date(updates.date).toISOString() : new Date().toISOString();
        if (updates.items !== undefined) dbUpdates.items = updates.items;
        if (updates.totalValue !== undefined) dbUpdates.total_value = updates.totalValue;
        if (updates.observation !== undefined) dbUpdates.observation = updates.observation || '';
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.stockProcessed !== undefined) dbUpdates.stockProcessed = updates.stockProcessed;
        if (updates.invoiceNumber !== undefined) dbUpdates.invoice_number = updates.invoiceNumber || null;
        if (updates.invoiceDate !== undefined) dbUpdates.invoice_date = updates.invoiceDate && updates.invoiceDate.trim() !== '' ? new Date(updates.invoiceDate).toISOString() : null;
        if (updates.invoiceStatus !== undefined) dbUpdates.invoice_status = updates.invoiceStatus;
        if (updates.fiscalKey !== undefined) dbUpdates.fiscal_key = updates.fiscalKey || null;
        if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments || [];

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        currentPurchases = currentPurchases.map(p => p.id === id ? merged : p);
        notifyListeners();

        if (updates.items && merged.stockProcessed) {
            for (const item of updates.items) {
                await supabase
                    .from('inventory_moves')
                    .update({ unit_cost: item.unitCost })
                    .eq('product_id', item.productId)
                    .eq('type', 'entry')
                    .like('observation', `%${id}%`);
            }
        }
    } catch (error) {
        console.error("Erro ao atualizar compra: ", error);
        throw error;
    }
};

const mapToDB = (p: Purchase) => ({
    supplier_id: p.supplierId || null,
    supplier_name: p.supplierName || null,
    date: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
    items: p.items || [],
    total_value: p.totalValue || 0,
    observation: p.observation || '',
    status: p.status || 'ordered',
    invoice_number: p.invoiceNumber || null,
    invoice_date: p.invoiceDate && p.invoiceDate.trim() !== '' ? new Date(p.invoiceDate).toISOString() : null,
    invoice_status: p.invoiceStatus || 'pending',
    fiscal_key: p.fiscalKey || null,
    attachments: p.attachments || [],
    ipi_value: p.ipiPercent || 0,
    freight_percent: p.freightPercent || 0,
    created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString()
});

const mapFromDB = (data: any, sequentialIndex?: number): Purchase => ({
    id: String(data.id),
    purchaseNumber: data.purchase_number ? Number(data.purchase_number) : (sequentialIndex !== undefined ? sequentialIndex : undefined),
    supplierId: data.supplier_id,
    supplierName: data.supplier_name,
    date: data.date,
    items: data.items,
    totalValue: Number(data.total_value),
    observation: data.observation,
    status: data.status === 'opened' ? 'ordered' : data.status,
    invoiceNumber: data.invoice_number,
    invoiceDate: data.invoice_date,
    invoiceStatus: data.invoice_status,
    fiscalKey: data.fiscal_key,
    attachments: data.attachments || [],
    ipiPercent: data.ipi_value ? Number(data.ipi_value) : 0,
    freightPercent: data.freight_percent ? Number(data.freight_percent) : 0,
    createdAt: data.created_at,
    stockProcessed: !!data.stockProcessed
});
