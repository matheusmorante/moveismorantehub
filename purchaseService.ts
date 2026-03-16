import { supabase } from '@/pages/utils/supabaseConfig';
import Purchase from "../types/purchase.type";
import { saveInventoryMove } from '@/pages/utils/inventoryService';
import { getSettings } from '@/pages/utils/settingsService';

const TABLE_NAME = "purchases";

export const subscribeToPurchases = (callback: (purchases: Purchase[]) => void) => {
    supabase.from(TABLE_NAME)
        .select('*')
        .order('date', { ascending: false })
        .then(({ data, error }) => {
            if (data && !error) {
                callback(data.map(mapFromDB));
            } else if (error) {
                console.error("Erro ao buscar compras iniciais:", error);
                callback([]);
            }
        });

    const channel = supabase.channel('purchases_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            supabase.from(TABLE_NAME)
                .select('*')
                .order('date', { ascending: false })
                .then(({ data }) => {
                    if (data) callback(data.map(mapFromDB));
                });
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

const processInventoryMoves = async (purchase: Purchase, savedId: string) => {
    for (const item of purchase.items) {
        // Fetch current stock
        const { data: p } = await supabase.from('products').select('stock').eq('id', item.productId).single();
        const currentStockValue = p?.stock || 0;

        // Use physical received quantity by default if available, fallback to ordered qty
        const qtyToMove = (item.receivedQuantity !== undefined) ? item.receivedQuantity : item.quantity;
        
        if (qtyToMove <= 0) continue;

        await saveInventoryMove({
            productId: item.productId,
            variationId: item.variationId,
            productDescription: item.description,
            type: 'entry',
            quantity: qtyToMove,
            date: new Date().toISOString(),
            label: purchase.invoiceNumber ? `Entrada NF-${purchase.invoiceNumber}` : `Entrada do Pedido nº ${savedId}`,
            observation: `Pedido de Compra | Fornecedor: ${purchase.supplierName || 'Desconhecido'}${purchase.invoiceNumber ? ` | NF: ${purchase.invoiceNumber}` : ''}`,
            unitCost: item.unitCost
        }, currentStockValue);
    }
    
    // Mark purchase as processed so we don't duplicate on future updates
    await supabase.from(TABLE_NAME).update({ stockProcessed: true }).eq('id', savedId);
};

export const savePurchase = async (purchase: Purchase): Promise<void> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([mapToDB(purchase)])
            .select();

        if (error) throw error;
        const savedId = data?.[0]?.id;

        // Automation Check
        const settings = getSettings();
        const shouldEnterStock = purchase.status && settings.inventoryAutomation?.autoEntryOnPurchaseStatus?.includes(purchase.status);

        if (shouldEnterStock && !purchase.stockProcessed) {
            await processInventoryMoves(purchase, savedId);
        }
    } catch (error) {
        console.error("Erro ao salvar compra: ", error);
        throw error;
    }
};

export const updatePurchase = async (id: string, updates: Partial<Purchase>): Promise<void> => {
    try {
        // Fetch existing record to ensure we have full context for automation
        const { data: existing } = await supabase.from(TABLE_NAME).select('*').eq('id', id).single();
        if (!existing) throw new Error("Pedido não encontrado");

        const currentPurchase = mapFromDB(existing);
        const merged: Purchase = { ...currentPurchase, ...updates };

        const dbUpdates: any = {};
        if (updates.supplierId) dbUpdates.supplier_id = updates.supplierId;
        if (updates.supplierName) dbUpdates.supplier_name = updates.supplierName;
        if (updates.date) dbUpdates.date = updates.date;
        if (updates.items) dbUpdates.items = updates.items;
        if (updates.totalValue) dbUpdates.total_value = updates.totalValue;
        if (updates.observation) dbUpdates.observation = updates.observation;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.stockProcessed !== undefined) dbUpdates.stockProcessed = updates.stockProcessed;
        if (updates.invoiceNumber !== undefined) dbUpdates.invoice_number = updates.invoiceNumber;
        if (updates.invoiceDate !== undefined) dbUpdates.invoice_date = updates.invoiceDate;
        if (updates.invoiceStatus !== undefined) dbUpdates.invoice_status = updates.invoiceStatus;

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;

        // Automation Check on Update
        const settings = getSettings();
        const shouldEnterStock = merged.status && settings.inventoryAutomation?.autoEntryOnPurchaseStatus?.includes(merged.status);

        if (shouldEnterStock && !merged.stockProcessed) {
            await processInventoryMoves(merged, id);
        }

        // Propagate cost changes to inventory_moves if items updated ONLY if already processed
        if (updates.items && merged.stockProcessed) {
            for (const item of updates.items) {
                await supabase
                    .from('inventory_moves')
                    .update({ unit_cost: item.unitCost })
                    .eq('product_id', item.productId)
                    .eq('type', 'entry')
                    .like('observation', `%Pedido de Compra #${id}%`);
            }
        }
    } catch (error) {
        console.error("Erro ao atualizar compra: ", error);
        throw error;
    }
};

const mapToDB = (p: Purchase) => ({
    supplier_id: p.supplierId,
    supplier_name: p.supplierName,
    date: p.date,
    items: p.items,
    total_value: p.totalValue,
    observation: p.observation,
    status: p.status,
    invoice_number: p.invoiceNumber,
    invoice_date: p.invoiceDate,
    invoice_status: p.invoiceStatus,
    created_at: p.createdAt || new Date().toISOString()
});

const mapFromDB = (data: any): Purchase => ({
    id: String(data.id),
    supplierId: data.supplier_id,
    supplierName: data.supplier_name,
    date: data.date,
    items: data.items,
    totalValue: Number(data.total_value),
    observation: data.observation,
    status: data.status,
    invoiceNumber: data.invoice_number,
    invoiceDate: data.invoice_date,
    invoiceStatus: data.invoice_status,
    createdAt: data.created_at,
    stockProcessed: data.stockProcessed
});
