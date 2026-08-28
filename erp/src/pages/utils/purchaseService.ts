import { supabase } from '@/pages/utils/supabaseConfig';
import Purchase from "../types/purchase.type";
import { saveInventoryMove } from '@/pages/utils/inventoryService';
import { getSettings } from '@/pages/utils/settingsService';

const TABLE_NAME = "purchases";



export const subscribeToPurchases = (callback: (purchases: Purchase[]) => void) => {
    let currentPurchases: Purchase[] = [];

    const fetchAll = () => {
        supabase.from(TABLE_NAME)
            .select('*')
            .order('date', { ascending: false })
            .then((response: any) => {
                const { data, error } = response;
                if (data && !error) {
                    currentPurchases = data.map(mapFromDB);
                    callback(currentPurchases);
                } else if (error) {
                    console.error("Erro ao buscar compras iniciais:", error);
                    callback([]);
                }
            });
    };

    fetchAll();

    return () => {
        // Realtime desabilitado para economizar conexões e tráfego
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
            relatedEntityId: savedId,
            relatedEntityType: 'purchase_order',
            observation: `Pedido de Compra #${savedId} | Fornecedor: ${purchase.supplierName || 'Desconhecido'}${purchase.invoiceNumber ? ` | NF: ${purchase.invoiceNumber}` : ''}`,
            unitCost: item.unitCost
        }, currentStockValue);
    }
    
    await supabase.from(TABLE_NAME).update({ stockProcessed: true }).eq('id', savedId);
};

export const reverseInventoryMoves = async (purchaseId: string) => {
    // Procura por movimentações que tenham o ID do pedido na observação ou label
    const searchPattern = `%Pedido de Compra #${purchaseId}%`;
    const { data: moves, error } = await supabase
        .from('inventory_moves')
        .select('id')
        .or(`observation.ilike.${searchPattern},label.ilike.%${purchaseId}%`);

    if (error) {
        console.error("Erro ao buscar lançamentos para estorno:", error);
        throw error;
    }

    if (moves && moves.length > 0) {
        // Importamos a função de deletar do inventoryService para garantir que o estoque seja revertido
        const { deleteInventoryMove } = await import('@/pages/utils/inventoryService');
        for (const move of moves) {
            await deleteInventoryMove(move.id);
        }
    }

    // Marcar como não processado
    await supabase.from(TABLE_NAME).update({ stockProcessed: false }).eq('id', purchaseId);
};

export const cancelPurchase = async (purchase: Purchase): Promise<void> => {
    if (!purchase.id) return;

    if (purchase.status === 'cancelled') {
        throw new Error("Este pedido de compra já está cancelado.");
    }

    // Validar se o estoque ainda está lançado
    if (purchase.stockProcessed) {
        throw new Error("Não é possível cancelar um pedido com entrada de estoque ativa. Por favor, estorne a entrada de estoque antes de cancelar.");
    }

    // Checar se há lançamentos residuais no banco de dados
    const searchPattern = `%Pedido de Compra #${purchase.id}%`;
    const { data: moves } = await supabase
        .from('inventory_moves')
        .select('id')
        .or(`observation.ilike.${searchPattern},label.ilike.%${purchase.id}%`);

    if (moves && moves.length > 0) {
        throw new Error("Existem movimentações de estoque vinculadas a este pedido. Realize o estorno da entrada antes de cancelar.");
    }

    const { error } = await supabase
        .from(TABLE_NAME)
        .update({ status: 'cancelled' })
        .eq('id', purchase.id);

    if (error) {
        console.error("Erro ao cancelar compra:", error);
        throw error;
    }
};

export const toggleStockProcessing = async (purchase: Purchase): Promise<void> => {
    if (!purchase.id) return;
    
    if (purchase.stockProcessed) {
        await reverseInventoryMoves(purchase.id);
    } else {
        await processInventoryMoves(purchase, purchase.id);
    }
};

export const savePurchase = async (purchase: Purchase): Promise<void> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([mapToDB(purchase)])
            .select();

        if (error) throw error;
        const savedId = data?.[0]?.id;

        const isEntryStatus = purchase.status === 'ordered' || purchase.status === 'fulfilled';
        if (isEntryStatus && !purchase.stockProcessed) {
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

        // Automation Check on Update
        const isEntryStatus = merged.status === 'ordered' || merged.status === 'fulfilled';
        const isCancelled = merged.status === 'cancelled';
        
        if (isEntryStatus && !merged.stockProcessed) {
            await processInventoryMoves(merged, id);
        } else if (isCancelled && merged.stockProcessed) {
            await reverseInventoryMoves(id);
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
    supplier_id: p.supplierId || null,
    supplier_name: p.supplierName || null,
    date: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
    items: p.items || [],
    total_value: p.totalValue || 0,
    observation: p.observation || '',
    status: p.status || 'opened',
    invoice_number: p.invoiceNumber || null,
    invoice_date: p.invoiceDate && p.invoiceDate.trim() !== '' ? new Date(p.invoiceDate).toISOString() : null,
    invoice_status: p.invoiceStatus || 'pending',
    fiscal_key: p.fiscalKey || null,
    attachments: p.attachments || [],
    ipi_value: p.ipiPercent || 0,
    freight_percent: p.freightPercent || 0,
    created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString()
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
    fiscalKey: data.fiscal_key,
    attachments: data.attachments || [],
    ipiPercent: data.ipi_value ? Number(data.ipi_value) : 0,
    freightPercent: data.freight_percent ? Number(data.freight_percent) : 0,
    createdAt: data.created_at,
    stockProcessed: data.stockProcessed
});
