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

            // Fetch people to populate legacy missing marketingOrigin
            let peopleOrigins: Record<string, string> = {};
            try {
                const { data: peopleData } = await supabase.from('people').select('id, full_name, marketing_origin');
                if (peopleData) {
                    peopleData.forEach((p: any) => {
                        const origin = p.marketing_origin || '';
                        if (p.id) peopleOrigins[String(p.id)] = origin;
                        if (p.full_name) peopleOrigins[String(p.full_name).trim().toLowerCase()] = origin;
                    });
                }
            } catch (e) {
                console.error('[OrdersSync] Failed to fetch people origins', e);
            }

            if (data && Array.isArray(data)) {
                console.log('[OrdersSync] Data received, count:', data.length);
                const orders = data.map((row: any) => {
                    try {
                        const rawData = { ...(row.order_data || {}), id: String(row.id) } as Order;
                        // Inject marketing origin from people registry for legacy orders
                        const cInfo = rawData.customerData;
                        
                        let legacyMarketingOrig: string | undefined = undefined;
                        if (cInfo?.id && peopleOrigins[String(cInfo.id)]) {
                            legacyMarketingOrig = peopleOrigins[String(cInfo.id)];
                        } else if (cInfo?.fullName && peopleOrigins[String(cInfo.fullName).trim().toLowerCase()]) {
                            legacyMarketingOrig = peopleOrigins[String(cInfo.fullName).trim().toLowerCase()];
                        }
                        
                        if (legacyMarketingOrig === 'paid') {
                            // Automatically override if CRM says they are paid
                            rawData.marketingOrigin = 'paid';
                        } else if (legacyMarketingOrig && (!rawData.marketingOrigin || rawData.marketingOrigin === 'Direto na Loja')) {
                            // Only set organic/others if order doesn't have a valid one
                            rawData.marketingOrigin = legacyMarketingOrig;
                        }
                        
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
                console.log('[OrdersSync] Change detected in orders, refetching...');
                fetchAndCallback();
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, (payload: any) => {
            if (!aborted) {
                console.log('[OrdersSync] Change detected in people (CRM), refetching to update marketing origins...');
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

/**
 * Desfaz uma devolução, retornando os itens ao pedido original e deletando o pedido de devolução.
 */
export const undoReturn = async (order: Order): Promise<void> => {
    if (!order.id) return;
    
    try {
        let originalOrder: Order;
        let returnOrder: Order;

        if (order.orderType === 'return') {
            // Context: The user clicked "Undo" on the Return order itself
            returnOrder = order;
            if (!order.linkedOrderId) {
                throw new Error("Este pedido de devolução não possui um pedido original vinculado.");
            }

            // Fetch the original order
            const { data: origRow, error: origError } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .eq('id', order.linkedOrderId)
                .single();
            
            if (origError || !origRow) {
                throw new Error("Pedido original não encontrado.");
            }
            originalOrder = { ...origRow.order_data, id: String(origRow.id) } as Order;
        } else {
            // Context: The user clicked "Undo" on the original Sale order
            originalOrder = order;
            let returnId = originalOrder.returnOrderId;
            
            if (!returnId) {
                const { data: linkedReturns } = await supabase
                    .from(TABLE_NAME)
                    .select('id')
                    .eq('order_data->>linkedOrderId', originalOrder.id)
                    .eq('order_data->>orderType', 'return')
                    .limit(1);
                
                if (linkedReturns && linkedReturns.length > 0) {
                    returnId = String(linkedReturns[0].id);
                }
            }

            if (!returnId) {
                throw new Error("Nenhum pedido de devolução vinculado encontrado.");
            }

            // Fetch return order
            const { data: returnRow, error: fetchError } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .eq('id', returnId)
                .single();
                
            if (fetchError || !returnRow) {
                throw new Error("Pedido de devolução não encontrado.");
            }
            returnOrder = { ...returnRow.order_data, id: String(returnRow.id) } as Order;
        }

        // 1. Merge items back
        const restoredItems = [...originalOrder.items];
        returnOrder.items.forEach(retItem => {
            const index = restoredItems.findIndex(i => i.id === retItem.id);
            if (index !== -1) {
                // Se o item já existir no original (devolução parcial), somamos a quantidade
                restoredItems[index] = {
                    ...restoredItems[index],
                    quantity: restoredItems[index].quantity + retItem.quantity,
                    totalValue: (restoredItems[index].quantity + retItem.quantity) * restoredItems[index].unitPrice
                };
            } else {
                // Se o item não existir (devolução total anterior), adicionamos de volta
                restoredItems.push(retItem);
            }
        });

        // 2. Prepare original order update
        const totalItemsValue = restoredItems.reduce((acc, i) => acc + (i.totalValue || 0), 0);
        const subtotal = totalItemsValue + (originalOrder.shipping?.value || 0);
        const totalDiscount = (originalOrder.paymentsSummary?.discount || 0);
        const totalOrderValue = subtotal - totalDiscount;

        const originalUpdate: Partial<Order> = {
            items: restoredItems,
            returnOrderId: undefined as any, // Limpa o vínculo
            paymentsSummary: {
                ...originalOrder.paymentsSummary,
                totalItemsValue,
                subtotal,
                totalOrderValue
            },
            itemsSummary: {
                totalItems: restoredItems.length,
                totalQuantity: restoredItems.reduce((acc, i) => acc + i.quantity, 0),
                totalValue: totalItemsValue
            }
        };

        // Clear return note patterns
        if (originalOrder.observation) {
            originalUpdate.observation = originalOrder.observation
                .replace(/\[DEVOLUÇÃO GERADA EM .*?\]/g, '')
                .replace(/\[CANCELADO POR DEVOLUÇÃO TOTAL\]/g, '')
                .trim();
        }

        // Restore status if it was cancelled due to full return
        if (originalOrder.status === 'cancelled') {
            originalUpdate.status = 'scheduled'; 
        }

        // 3. Update Original Order in DB
        await updateOrder(originalOrder.id!, originalUpdate, originalOrder);

        // 4. Permanently delete the return order
        await permanentDeleteOrder(returnOrder.id!);

    } catch (error) {
        console.error("Erro ao desfazer devolução:", error);
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
