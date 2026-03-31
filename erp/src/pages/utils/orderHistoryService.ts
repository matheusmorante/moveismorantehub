import Order from "../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from "./formatters";
import { saveInventoryMove, getAvailableLots, cancelInventoryMovesByRelatedEntity, deleteInventoryMovesByRelatedEntity } from '@/pages/utils/inventoryService';
import { updateProduct } from '@/pages/utils/productService';
import { getSettings } from '@/pages/utils/settingsService';

const TABLE_NAME = "orders";

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
    console.log('[OrdersSync] Start subscription');

    let aborted = false;

    const fetchAndCallback = async () => {
        if (aborted) return;
        try {
            console.log('[OrdersSync] Fetching data...');

            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .order('id', { ascending: false });

            if (aborted) {
                console.log('[OrdersSync] Fetch completed but subscription was cancelled, ignoring.');
                return;
            }

            if (error) {
                console.error('[OrdersSync] Fetch error:', error);
                callback([]);
                return;
            }

            if (data && Array.isArray(data)) {
                console.log('[OrdersSync] Data received, count:', data.length);
                const orders = data.map((row: any) => {
                    try {
                        const rawData = { ...(row.order_data || {}), id: String(row.id) } as Order;
                        return capitalizeOrder(rawData);
                    } catch (_e) {
                        return { ...(row.order_data || {}), id: String(row.id) } as Order;
                    }
                });
                callback(orders);
            } else {
                console.warn('[OrdersSync] No data or invalid format:', typeof data);
                callback([]);
            }
        } catch (err) {
            if (!aborted) {
                console.error('[OrdersSync] Exception in fetch:', err);
                callback([]);
            }
        }
    };

    fetchAndCallback();

    const channel = supabase.channel(`orders_changes_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, (payload: any) => {
            if (!aborted) {
                console.log('[OrdersSync] Change detected, refetching...');
                fetchAndCallback();
            }
        })
        .subscribe((status: string) => {
            console.log('[OrdersSync] Channel status:', status);
        });

    return () => {
        console.log('[OrdersSync] Removing channel');
        aborted = true;
        supabase.removeChannel(channel);
    };
};

export const saveOrder = async (order: Order): Promise<string> => {
    if (order.id) {
        await updateOrder(order.id, order);
        return order.id;
    }

    try {
        const orderToSave = { ...order };
        delete orderToSave.id;

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([{
                order_data: orderToSave,
                updated_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;
        const rowId = (data as any)?.[0]?.id;

        // Log initial status history
        try {
            await supabase.from('order_status_history').insert([{
                order_id: String(rowId),
                old_status: null,
                new_status: orderToSave.status || 'draft',
                changed_by: (orderToSave as any).seller || 'system'
            }]);
        } catch (historyErr) {
            console.error("[OrderCreate] Erro ao gravar histórico de status inicial:", historyErr);
        }

        // Stock Management logic refactored
        const updatedOrder = await handleStockAndBusinessRules(rowId, orderToSave);
        if (updatedOrder.stockProcessed) {
            await updateOrder(String(rowId), { stockProcessed: true });
        }

        return String(rowId);
    } catch (error) {
        console.error("Erro ao salvar o pedido: ", error);
        throw error;
    }
};

/**
 * Centralized logic for stock movements based on settings and order state.
 * Returns the modified order with stockProcessed flag if applicable.
 */
export async function handleStockAndBusinessRules(orderId: string, order: Order, force: boolean = false): Promise<Order> {
    const settings = getSettings();
    const { businessRules, inventoryAutomation } = settings;
    const orderToUpdate = { ...order };

    // Don't process assistance orders or orders already processed (unless forced)
    if (order.orderType !== 'sale' || (order.stockProcessed && !force)) return orderToUpdate;

    // Determine if stock should be subtracted based on new automation settings or force flag
    const shouldSubtractStock = force || (order.status && inventoryAutomation?.autoWithdrawalOnStatus?.includes(order.status));

    if (shouldSubtractStock && order.items) {
        let itemsProcessed = 0;

        // All checks passed, proceed with withdrawal
        for (const item of order.items) {
            if (item.productId && item.productId.trim() !== '') {
                itemsProcessed++;
                const { data: p } = await supabase.from('products').select('*').eq('id', item.productId).single();
                if (!p) continue;
                
                const currentStock = p.stock || 0;

                // Handle Combo Items
                if (p.isCombo && p.combo_items && Array.isArray(p.combo_items)) {
                    for (const comboItem of p.combo_items) {
                        const { data: part } = await supabase.from('products').select('stock').eq('id', comboItem.productId).single();
                        const currentPartStock = part?.stock || 0;

                        await saveInventoryMove({
                            productId: comboItem.productId,
                            variationId: comboItem.variationId,
                            productDescription: comboItem.description || `Parte do combo ${item.description}`,
                            type: 'withdrawal',
                            quantity: comboItem.quantity * item.quantity,
                            date: new Date().toISOString(),
                            label: `Pedido #${orderId}`,
                            relatedEntityId: orderId,
                            relatedEntityType: 'sales_order',
                            observation: `Parte do combo ${item.description}`
                        }, currentPartStock);
                    }
                }

                // Record moves using FIFO logic
                let remainingToWithdraw = item.quantity;
                const availableLots = await getAvailableLots(item.productId, item.variationId);

                if (availableLots.length === 0) {
                    // Fallback if no lots found (e.g. migration data without lots)
                    await saveInventoryMove({
                        productId: item.productId,
                        variationId: item.variationId,
                        productDescription: item.description,
                        type: 'withdrawal',
                        quantity: item.quantity,
                        date: new Date().toISOString(),
                        label: `Pedido #${orderId}`,
                        relatedEntityId: orderId,
                        relatedEntityType: 'sales_order',
                        observation: `FIFO Fallback`
                    }, currentStock);
                } else {
                    for (const lot of availableLots) {
                        if (remainingToWithdraw <= 0) break;

                        const takeFromLot = Math.min(remainingToWithdraw, lot.balance);
                        await saveInventoryMove({
                            productId: item.productId,
                            variationId: item.variationId,
                            productDescription: item.description,
                            type: 'withdrawal',
                            quantity: takeFromLot,
                            date: new Date().toISOString(),
                            label: `Pedido #${orderId}`,
                            relatedEntityId: orderId,
                            relatedEntityType: 'sales_order',
                            observation: `Lote de ${new Date(lot.date).toLocaleDateString()}`,
                            unitCost: lot.unitCost, // USE THE LOT COST!
                            parentMoveId: lot.id   // LINK TO LOT
                        }, currentStock);

                        remainingToWithdraw -= takeFromLot;
                    }

                    // If still remaining (inventory mismatch), record as unlinked withdrawal
                    if (remainingToWithdraw > 0) {
                        await saveInventoryMove({
                            productId: item.productId,
                            variationId: item.variationId,
                            productDescription: item.description,
                            type: 'withdrawal',
                            quantity: remainingToWithdraw,
                            date: new Date().toISOString(),
                            label: `Pedido #${orderId}`,
                            relatedEntityId: orderId,
                            relatedEntityType: 'sales_order',
                            observation: `Quantidade acima dos lotes disponíveis`
                        }, currentStock);
                    }
                }
            }
        }

        if (itemsProcessed > 0) {
            orderToUpdate.stockProcessed = true;
        } else if (force) {
            throw new Error("Nenhum item deste pedido está vinculado a um produto do catálogo. Não há estoque para lançar.");
        }
    }

    return orderToUpdate;
}

/**
 * Manually reverses stock movements for an order.
 */
export async function manuallyReverseStock(orderId: string): Promise<void> {
    await cancelInventoryMovesByRelatedEntity(orderId, 'sales_order');
}

/**
 * Atualiza um pedido. Quando `currentOrder` é fornecido (estado local),
 * o pré-fetch no banco é evitado — apenas o update é executado.
 */
export const updateOrder = async (
    id: string,
    orderToUpdate: Partial<Order>,
    currentOrder?: Order
): Promise<void> => {
    try {
        let merged: any;

        if (currentOrder) {
            // Temos o pedido completo em memória — skip do SELECT no banco
            const { id: _id, ...rest } = { ...(currentOrder || {}), ...orderToUpdate, id: undefined } as any;
            merged = rest;
        } else {
            // Fallback: busca o pedido completo no banco antes de mesclar
            const { data: current, error: fetchError } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) {
                // Se o fetch falhar mas tivermos a atualização parcial, tenta mesmo assim
                console.warn('Pré-fetch falhou, aplicando atualização parcial:', fetchError);
                const { id: _id, ...rest } = orderToUpdate as any;
                merged = rest;
            } else {
                const { id: _id, ...rest } = { ...(current?.order_data || {}), ...orderToUpdate, id: undefined } as any;
                merged = rest;
            }
        }

        if ((merged as any).shipping?.orderType) {
            console.log(`[OrderUpdate] Salvando modalidade global: ${(merged as any).shipping.orderType}`);
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .update({
                order_data: merged,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // Log status change
        const oldStatus = currentOrder?.status;
        const newStatus = orderToUpdate.status;

        if (newStatus && oldStatus !== newStatus) {
            try {
                await supabase.from('order_status_history').insert([{
                    order_id: id,
                    old_status: oldStatus || null,
                    new_status: newStatus,
                    changed_by: (orderToUpdate as any).seller || (merged as any).seller || 'system'
                }]);
            } catch (historyErr) {
                console.error("[OrderUpdate] Erro ao gravar histórico de status:", historyErr);
            }

            const { inventoryAutomation } = getSettings();

            // Auto-withdrawal: new status triggers stock deduction and stock wasn't processed yet
            if (!merged.stockProcessed && inventoryAutomation?.autoWithdrawalOnStatus?.includes(newStatus)) {
                try {
                    const updatedOrder = await handleStockAndBusinessRules(id, { ...merged, status: newStatus });
                    if (updatedOrder.stockProcessed) {
                        await supabase
                            .from(TABLE_NAME)
                            .update({ 
                                order_data: { ...merged, status: newStatus, stockProcessed: true }, 
                                updated_at: new Date().toISOString() 
                            })
                            .eq('id', id);
                    }
                } catch (stockErr) {
                    console.error("[OrderUpdate] Erro ao processar estoque automática (saída):", stockErr);
                }
            }

            // Auto-reversal: order is being cancelled and stock was already processed
            if (newStatus === 'cancelled' && merged.stockProcessed) {
                try {
                    // New logic: just cancel the movements, it reverts stock automatically inside
                    await cancelInventoryMovesByRelatedEntity(id, 'sales_order');
                    
                    // Mark as unprocessed after reversal/cancellation
                    await supabase
                        .from(TABLE_NAME)
                        .update({ 
                            order_data: { ...merged, status: newStatus, stockProcessed: false }, 
                            updated_at: new Date().toISOString() 
                        })
                        .eq('id', id);
                } catch (reversalErr) {
                    console.error("[OrderUpdate] Erro ao cancelar movimentações de estoque:", reversalErr);
                }
            }
        } else if (!merged.stockProcessed) {
            // No status change but stock may still need processing (e.g. status was already 'scheduled' on save)
            try {
                const updatedOrder = await handleStockAndBusinessRules(id, merged);
                if (updatedOrder.stockProcessed) {
                    await supabase
                        .from(TABLE_NAME)
                        .update({ 
                            order_data: { ...merged, stockProcessed: true }, 
                            updated_at: new Date().toISOString() 
                        })
                        .eq('id', id);
                }
            } catch (stockErr) {
                console.error("[OrderUpdate] Erro ao processar estoque (manutenção):", stockErr);
            }
        }
    } catch (error) {
        console.error("Erro ao atualizar o pedido: ", error);
        throw error;
    }
};

export const moveToTrash = async (id: string): Promise<void> => {
    try {
        await updateOrder(id, {
            deleted: true,
            deletedAt: new Date().toLocaleString('pt-BR')
        } as any);
    } catch (error) {
        console.error("Erro ao mover para lixeira: ", error);
        throw error;
    }
};

export const restoreOrder = async (id: string): Promise<void> => {
    try {
        await updateOrder(id, {
            deleted: false,
            deletedAt: null
        } as any);
    } catch (error) {
        console.error("Erro ao restaurar o pedido: ", error);
        throw error;
    }
};

export const permanentDeleteOrder = async (id: string): Promise<void> => {
    try {
        // Permanently delete related inventory moves too
        await deleteInventoryMovesByRelatedEntity(id, 'sales_order');

        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Erro ao deletar permanentemente o pedido: ", error);
        throw error;
    }
};

/** @deprecated Use moveToTrash instead */
export const deleteOrder = moveToTrash;

/**
 * Analisa os últimos pedidos para identificar a frequência de uso de avisos (observações)
 */
export const getNoticeFrequency = async (): Promise<Record<string, number>> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('order_data')
            .order('id', { ascending: false })
            .limit(200);

        if (error) throw error;

        const frequency: Record<string, number> = {};
        
        data?.forEach((row: any) => {
            const observation = row.order_data?.observation;
            if (observation) {
                const tags = observation.split(';').map((t: string) => t.trim()).filter((t: string) => t !== "");
                tags.forEach((tag: string) => {
                    frequency[tag] = (frequency[tag] || 0) + 1;
                });
            }
        });

        return frequency;
    } catch (error) {
        console.error("Erro ao carregar frequência de avisos:", error);
        return {};
    }
};

/**
 * Busca todos os pedidos que contenham um determinado produto
 */
export const getOrdersByProductId = async (productId: string, productSku?: string, productDescription?: string): Promise<Order[]> => {
    try {
        const idStr = String(productId);
        const queryPromises: any[] = [];
        const baseQuery = () => supabase.from(TABLE_NAME).select('*').order('id', { ascending: false });

        // 1. Busca por ID em itens e assistência
        queryPromises.push(baseQuery().contains('order_data', { items: [{ productId: idStr }] }));
        queryPromises.push(baseQuery().contains('order_data', { items: [{ variationId: idStr }] }));
        queryPromises.push(baseQuery().contains('order_data', { assistanceItems: [{ id: idStr }] }));

        const numId = parseInt(idStr);
        if (!isNaN(numId)) {
            queryPromises.push(baseQuery().contains('order_data', { items: [{ productId: numId }] }));
            queryPromises.push(baseQuery().contains('order_data', { items: [{ variationId: numId }] }));
        }

        // 2. Busca por SKU/Code se fornecido
        if (productSku) {
            queryPromises.push(baseQuery().contains('order_data', { items: [{ code: productSku }] }));
            queryPromises.push(baseQuery().contains('order_data', { items: [{ sku: productSku }] }));
            queryPromises.push(baseQuery().contains('order_data', { assistanceItems: [{ sku: productSku }] }));
        }

        // 3. Busca por Descrição se fornecida
        if (productDescription) {
            queryPromises.push(baseQuery().contains('order_data', { items: [{ description: productDescription }] }));
            queryPromises.push(baseQuery().contains('order_data', { assistanceItems: [{ description: productDescription }] }));
        }

        const results = await Promise.all(queryPromises);
        const uniqueOrders = new Map<string, Order>();

        results.forEach(res => {
            if (res.data) {
                res.data.forEach((row: any) => {
                    const rawData = { ...(row.order_data || {}), id: String(row.id) } as Order;
                    
                    // Filtrar orçamentos e deletados
                    const isBudget = rawData.orderType === 'budget';
                    if (!rawData.deleted && !isBudget && !uniqueOrders.has(rawData.id!)) {
                        uniqueOrders.set(rawData.id!, capitalizeOrder(rawData));
                    }
                });
            }
        });

        return Array.from(uniqueOrders.values()).sort((a, b) => Number(b.id) - Number(a.id));
    } catch (error) {
        console.error("Erro ao buscar pedidos por produto:", error);
        return [];
    }
};
