import Order from "../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from "./formatters";
import { saveInventoryMove, getAvailableLots, cancelInventoryMovesByRelatedEntity, deleteInventoryMovesByRelatedEntity } from '@/pages/utils/inventoryService';
import { updateProduct } from '@/pages/utils/productService';
import { getSettings } from '@/pages/utils/settingsService';
import { formatOrderCode, getNextOrderIndex, getOrderIndex } from './orderCode';
import { processReturnInventoryEntries } from './returnInventoryService';
import { canMaintainSaleStock, getChangedSaleItems, hasCatalogSaleItem, reverseSaleItemMoves } from './saleItemInventorySync';
import { splitNoticeTags } from './noticeTags';
import { dispatchAppNotification } from '@/pages/utils/pushNotificationService';
import {
    getOrderAssemblyKinds,
    notifyNewAssemblies,
    notifyNewSaleAndAssemblies,
} from '@/pages/utils/orderEventNotificationService';
import {
    detectOrderChangedAreas,
    formatOrderChangeNotification
} from '@/pages/utils/orderChangeDetector';

export const formatOrderSchedulingText = (shipping: any, order?: any): string => {
    const sched = shipping?.scheduling || {};
    if (sched.pendingScheduling) return 'Agendamento: Pendente';

    const formatDateStr = (dStr: string) => {
        if (!dStr) return '';
        const clean = dStr.split('T')[0];
        const parts = clean.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return clean;
    };

    const startDate = sched.date || order?.scheduled_date || order?.order_data?.scheduledDate;
    const endDate = sched.endDate;

    let dateLabel = '';
    if (sched.dateType === 'range' && endDate && startDate) {
        dateLabel = `${formatDateStr(startDate)} até ${formatDateStr(endDate)}`;
    } else if (startDate) {
        dateLabel = formatDateStr(startDate);
    }

    let timeLabel = '';
    if (sched.type === 'range' && sched.startTime && sched.endTime) {
        timeLabel = `${sched.startTime} até ${sched.endTime}`;
    } else if (sched.startTime) {
        timeLabel = sched.startTime;
    } else if (sched.time) {
        timeLabel = sched.time;
    }

    if (dateLabel && timeLabel) return `Agendado: ${dateLabel} (${timeLabel})`;
    if (dateLabel) return `Agendado: ${dateLabel}`;
    return '';
};

const TABLE_NAME = "orders";

const isValidOrderRow = (row: any) =>
    row?.id != null &&
    row.order_data &&
    typeof row.order_data === 'object' &&
    !Array.isArray(row.order_data) &&
    Object.keys(row.order_data).length > 0;

export const fetchOrdersPage = async (
    page = 1, 
    pageSize = 30,
    filters?: any
): Promise<{ orders: Order[]; total: number }> => {
    const firstRow = Math.max(0, (page - 1) * pageSize);
    const lastRow = firstRow + pageSize - 1;

    let query = supabase
        .from(TABLE_NAME)
        .select('*', { count: 'exact' });

    const showTrash = filters?.showTrash || false;
    const isDraft = filters?.isDraft || false;

    if (showTrash) {
        query = query.eq('deleted', true);
    } else {
        query = query.or('deleted.is.null,deleted.eq.false');
        if (isDraft) {
            query = query.eq('status', 'draft');
        }
    }

    if (filters?.searchId) {
        query = query.eq('id', filters.searchId);
    }

    query = query.order('created_at', { ascending: false }).range(firstRow, lastRow);

    const { data, count, error } = await query;
    if (error) {
        console.error('[OrdersService] Erro ao buscar página de pedidos:', error);
        return { orders: [], total: 0 };
    }

    const orders = (data || [])
        .filter(isValidOrderRow)
        .map((row: any) => {
            const idx = row.order_data?.orderIndex ?? row.order_data?.order_index ?? row.order_index ?? row.order_number ?? row.orderNumber ?? (Number.isInteger(Number(row.id)) ? Number(row.id) : undefined);
            return capitalizeOrder({ ...(row.order_data || {}), id: String(row.id), ...(idx != null ? { orderIndex: Number(idx) } : {}) } as Order);
        });

    return { orders, total: count || 0 };
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
    console.log('[OrdersSync] Start subscription');

    let aborted = false;
    let currentOrders: Order[] = [];

    const fetchAndCallback = async () => {
        if (aborted) return;
        try {
            console.log('[OrdersSync] Fetching data...');

            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(2000);

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
                currentOrders = data.filter(isValidOrderRow).map((row: any) => {
                    try {
                        const idx = row.order_data?.orderIndex ?? row.order_data?.order_index ?? row.order_index ?? row.order_number ?? row.orderNumber ?? (Number.isInteger(Number(row.id)) ? Number(row.id) : undefined);
                        const rawData = { ...(row.order_data || {}), id: String(row.id), ...(idx != null ? { orderIndex: Number(idx) } : {}) } as Order;
                        // Inject marketing origin from people registry for legacy orders
                        const cInfo = rawData.customerData;
                        
                        let legacyMarketingOrig: string | undefined = undefined;
                        if (cInfo?.id && peopleOrigins[String(cInfo.id)]) {
                            legacyMarketingOrig = peopleOrigins[String(cInfo.id)];
                        } else if (cInfo?.fullName && peopleOrigins[String(cInfo.fullName).trim().toLowerCase()]) {
                            legacyMarketingOrig = peopleOrigins[String(cInfo.fullName).trim().toLowerCase()];
                        }
                        
                        if (legacyMarketingOrig === 'paid') {
                            rawData.marketingOrigin = 'paid';
                        } else if (legacyMarketingOrig && (!rawData.marketingOrigin || rawData.marketingOrigin === 'organic' || rawData.marketingOrigin === 'Direto na Loja')) {
                            rawData.marketingOrigin = legacyMarketingOrig;
                        }
                        
                        // Handle legacy "Direto na Loja" string
                        if (rawData.marketingOrigin === 'Direto na Loja') rawData.marketingOrigin = 'organic';
                        if (rawData.marketingOrigin === 'Tráfego Pago') rawData.marketingOrigin = 'paid';
                        
                        const resolvedIndex = getOrderIndex({ ...rawData, id: row.id });
                        if (resolvedIndex && !rawData.orderIndex) {
                            rawData.orderIndex = resolvedIndex;
                            rawData.orderNumber = resolvedIndex;
                        }

                        return capitalizeOrder(rawData);
                    } catch (_e) {
                        const raw = { ...(row.order_data || {}), id: String(row.id) } as Order;
                        const idx = getOrderIndex(raw);
                        if (idx && !raw.orderIndex) {
                            raw.orderIndex = idx;
                            raw.orderNumber = idx;
                        }
                        return raw;
                    }
                });
                callback(currentOrders);
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
            if (aborted) return;
            console.log('[OrdersSync] Change detected in orders, event:', payload.eventType);
            
            if (payload.eventType === 'INSERT') {
                const newRow = payload.new;
                if (!isValidOrderRow(newRow)) return;
                try {
                    const rawData = { ...(newRow.order_data || {}), id: String(newRow.id) } as Order;
                    const resolvedIndex = getOrderIndex({ ...rawData, id: newRow.id });
                    if (resolvedIndex && !rawData.orderIndex) {
                        rawData.orderIndex = resolvedIndex;
                        rawData.orderNumber = resolvedIndex;
                    }
                    const formatted = capitalizeOrder(rawData);
                    currentOrders = [formatted, ...currentOrders];
                    callback(currentOrders);
                } catch (e) {
                    console.error('[OrdersSync] Error parsing inserted order, refetching...', e);
                    fetchAndCallback();
                }
            } else if (payload.eventType === 'UPDATE') {
                const updatedRow = payload.new;
                if (!isValidOrderRow(updatedRow)) {
                    currentOrders = currentOrders.filter(o => o.id !== String(updatedRow.id));
                    callback(currentOrders);
                    return;
                }
                try {
                    const rawData = { ...(updatedRow.order_data || {}), id: String(updatedRow.id) } as Order;
                    const resolvedIndex = getOrderIndex({ ...rawData, id: updatedRow.id });
                    if (resolvedIndex && !rawData.orderIndex) {
                        rawData.orderIndex = resolvedIndex;
                        rawData.orderNumber = resolvedIndex;
                    }
                    const formatted = capitalizeOrder(rawData);
                    currentOrders = currentOrders.map(o => o.id === formatted.id ? formatted : o);
                    callback(currentOrders);
                } catch (e) {
                    console.error('[OrdersSync] Error parsing updated order, refetching...', e);
                    fetchAndCallback();
                }
            } else if (payload.eventType === 'DELETE') {
                const deletedId = String(payload.old.id);
                currentOrders = currentOrders.filter(o => o.id !== deletedId);
                callback(currentOrders);
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
        orderToSave.deleted = false;
        orderToSave.deletedAt = null;

        // Garantir atribuição de código sequencial único de 6 dígitos
        if (!orderToSave.orderIndex) {
            try {
                const nextIndex = await getNextOrderIndex();
                orderToSave.orderIndex = nextIndex;
                orderToSave.orderNumber = nextIndex;
            } catch (idxErr) {
                console.error("[OrderCreate] Erro ao obter próximo código sequencial:", idxErr);
            }
        }

        // Se o cliente não tem ID, mas tem nome e não é Consumidor Final, vamos cadastrá-lo no CRM.
        if (orderToSave.customerData && !orderToSave.customerData.id && orderToSave.customerData.fullName && orderToSave.customerData.fullName.toLowerCase().trim() !== 'consumidor final') {
            try {
                const { savePerson } = await import("./personService");
                const personToSave = {
                    fullName: orderToSave.customerData.fullName,
                    phone: orderToSave.customerData.phone || '',
                    noPhone: orderToSave.customerData.noPhone || false,
                    fullAddress: orderToSave.customerData.fullAddress,
                    noAddress: orderToSave.customerData.noAddress || false,
                    additionalContacts: orderToSave.customerData.additionalContacts || [],
                    marketingOrigin: (orderToSave.marketingOrigin || 'organic') as any,
                    active: true,
                    type: 'customers' as const
                };
                const savedPerson = await savePerson('customers', personToSave as any);
                if (savedPerson && savedPerson.id) {
                    orderToSave.customerData.id = savedPerson.id;
                }
            } catch (savePersonErr) {
                console.error("[OrderCreate] Erro ao cadastrar cliente no CRM:", savePersonErr);
            }
        }

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

        // Sync customer data back to CRM if applicable
        if (orderToSave.customerData?.id) {
            try {
                const { updatePerson } = await import("./personService");
                await updatePerson('customers', orderToSave.customerData.id, {
                    phone: orderToSave.customerData.phone,
                    marketingOrigin: orderToSave.marketingOrigin as any
                });
            } catch (syncErr) {
                console.error("[OrderCreate] Error syncing customer data to CRM:", syncErr);
            }
        }

        // Disparar notificação em tempo real / push se for pedido agendado, montagem ou não rascunho
        if (orderToSave.status && orderToSave.status !== 'draft') {
            const schedText = formatOrderSchedulingText(orderToSave.shipping, orderToSave);
            try {
                await notifyNewSaleAndAssemblies({
                    orderId: String(rowId),
                    order: orderToSave,
                    scheduleText: schedText,
                });
            } catch (err) {
                console.error('[OrderCreate] Erro ao notificar app:', err);
            }
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

        const orderCode = formatOrderCode(order);
        const customerName = order.customerData?.fullName || (order as any).customerName || '';
        const baseMoveLabel = customerName ? `Saída - Pedido #${orderCode} - ${customerName}` : `Saída - Pedido #${orderCode}`;
        const baseMoveObs = `${customerName ? `Pedido de venda #${orderCode} - ${customerName}` : `Pedido de venda #${orderCode}`}${(order as any).inventoryMovementNote ? ` | ${(order as any).inventoryMovementNote}` : ''}`;

        // All checks passed, proceed with withdrawal
        for (const item of order.items) {
            if (item.productId && item.productId.trim() !== '' && !item.isTemporaryProduct) {
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
                            label: baseMoveLabel,
                            relatedEntityId: orderId,
                            relatedEntityType: 'sales_order',
                            observation: `${baseMoveObs} | Parte do combo ${item.description}`,
                            status: 'effective'
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
                        label: baseMoveLabel,
                        relatedEntityId: orderId,
                        relatedEntityType: 'sales_order',
                        observation: baseMoveObs,
                        unitPrice: item.unitPrice,
                        status: 'effective'
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
                            label: baseMoveLabel,
                            relatedEntityId: orderId,
                            relatedEntityType: 'sales_order',
                            observation: `${baseMoveObs} | Lote de ${new Date(lot.date).toLocaleDateString()}`,
                            unitCost: lot.unitCost, // USE THE LOT COST!
                            parentMoveId: lot.id,   // LINK TO LOT
                            unitPrice: item.unitPrice,
                            status: 'effective'
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
                            label: baseMoveLabel,
                            relatedEntityId: orderId,
                            relatedEntityType: 'sales_order',
                            observation: `${baseMoveObs} | Quantidade acima dos lotes disponíveis`,
                            unitPrice: item.unitPrice,
                            status: 'effective'
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

        let previousOrderData: any = currentOrder || null;

        if (currentOrder) {
            // Temos o pedido completo em memória — skip do SELECT no banco
            const { id: _id, ...rest } = { ...currentOrder, ...orderToUpdate } as any;
            merged = rest;
        } else {
            // Fallback: busca o pedido completo no banco antes de mesclar
            const { data: current, error: fetchError } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError || !current) {
                console.error('[OrderUpdate] Erro crítico: Não foi possível obter o pedido original para atualização segura.', fetchError);
                throw new Error("Não foi possível encontrar o pedido original para realizar a atualização. A operação foi cancelada para evitar perda de dados.");
            }

            previousOrderData = current.order_data || {};
            const { id: _id, ...rest } = { ...(current.order_data || {}), ...orderToUpdate } as any;
            merged = rest;
        }
        
        // Ensure ID is removed from the JSONB data to avoid redundancy and potential issues
        if (merged.id) delete merged.id;

        const previousStatus = previousOrderData?.status;
        if (orderToUpdate.status === 'draft' && previousStatus && previousStatus !== 'draft') {
            throw new Error('Um pedido já cadastrado não pode voltar para rascunho.');
        }
        if (previousStatus === 'cancelled' && orderToUpdate.status && orderToUpdate.status !== 'cancelled') {
            throw new Error('Um pedido cancelado não pode ter o status alterado. Duplique o pedido para criar uma nova venda.');
        }
        if (previousOrderData?.orderType === 'return' && previousStatus === 'fulfilled' && orderToUpdate.status === 'cancelled') {
            throw new Error("Uma devolução atendida não pode ser cancelada ou desfeita.");
        }

        // Se o cliente não tem ID, mas tem nome e não é Consumidor Final, vamos cadastrá-lo no CRM.
        if (merged.customerData && !merged.customerData.id && merged.customerData.fullName && merged.customerData.fullName.toLowerCase().trim() !== 'consumidor final') {
            try {
                const { savePerson } = await import("./personService");
                const personToSave = {
                    fullName: merged.customerData.fullName,
                    phone: merged.customerData.phone || '',
                    noPhone: merged.customerData.noPhone || false,
                    fullAddress: merged.customerData.fullAddress,
                    noAddress: merged.customerData.noAddress || false,
                    additionalContacts: merged.customerData.additionalContacts || [],
                    marketingOrigin: (merged.marketingOrigin || 'organic') as any,
                    active: true,
                    type: 'customers' as const
                };
                const savedPerson = await savePerson('customers', personToSave as any);
                if (savedPerson && savedPerson.id) {
                    merged.customerData.id = savedPerson.id;
                }
            } catch (savePersonErr) {
                console.error("[OrderUpdate] Erro ao cadastrar cliente no CRM:", savePersonErr);
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

        const changedItems = previousOrderData ? getChangedSaleItems(previousOrderData, merged) : [];
        const shouldSynchronizeItems = previousOrderData && previousOrderData.stockProcessed && changedItems.length > 0;
        if (shouldSynchronizeItems && merged.status !== 'cancelled') {
            const orderCode = formatOrderCode(merged);
            if (canMaintainSaleStock(merged)) {
                for (const change of changedItems) {
                    if (change.previous) {
                        await reverseSaleItemMoves(id, change.previous, `Item alterado no pedido de venda #${orderCode}.`);
                    }
                    if (change.current?.productId && !change.current.isTemporaryProduct) {
                        const updated = await handleStockAndBusinessRules(id, {
                            ...merged,
                            items: [change.current],
                            stockProcessed: false,
                            inventoryMovementNote: `Item alterado no pedido de venda #${orderCode}.`,
                        } as any, true);
                        merged.stockProcessed = Boolean(updated.stockProcessed);
                    }
                }
                merged.stockProcessed = hasCatalogSaleItem(merged);
                await supabase.from(TABLE_NAME).update({ order_data: { ...merged, stockProcessed: merged.stockProcessed }, updated_at: new Date().toISOString() }).eq('id', id);
            }
        }

        // Disparar notificações de atualização / agendamento
        const oldStatus = previousStatus;
        const newStatus = orderToUpdate.status || merged.status || oldStatus;
        const customerName = merged.customerData?.fullName || 'Cliente';
        const shortId = String(id).slice(-6).toUpperCase();
        const schedText = formatOrderSchedulingText(merged.shipping, merged);

        // 1. Mudança de status de rascunho -> agendado / não rascunho (ou criação com id preexistente do rascunho)
        const isFromDraftOrNew = (!oldStatus || oldStatus === 'draft') && newStatus && newStatus !== 'draft';
        if (isFromDraftOrNew) {
            try {
                await notifyNewSaleAndAssemblies({
                    orderId: String(id),
                    order: merged,
                    scheduleText: schedText,
                });
            } catch (err) {
                console.error('[OrderUpdate] Erro ao notificar pedido agendado:', err);
            }
        }

        if (!isFromDraftOrNew && previousOrderData) {
            const previousKinds = new Set(getOrderAssemblyKinds(previousOrderData));
            const newKinds = getOrderAssemblyKinds(merged).filter(kind => !previousKinds.has(kind));
            if (newKinds.length > 0) {
                try {
                    await notifyNewAssemblies({
                        orderId: String(id),
                        order: merged,
                        scheduleText: schedText,
                        kinds: newKinds,
                    });
                } catch (err) {
                    console.error('[OrderUpdate] Erro ao notificar nova montagem:', err);
                }
            }
        }

        // 2. Detecção e Notificação inteligente das áreas alteradas do pedido
        const changedAreas = detectOrderChangedAreas(previousOrderData, merged);

        if (changedAreas.length > 0 && oldStatus !== 'draft') {
            const notifData = formatOrderChangeNotification(customerName, changedAreas);
            try {
                await dispatchAppNotification({
                    orderId: String(id),
                    title: notifData.title,
                    message: notifData.message,
                    type: notifData.type,
                    scheduleText: schedText,
                    orderData: merged
                });
            } catch (err) {
                console.error('[OrderUpdate] Erro ao notificar alteração do pedido:', err);
            }
        }

        // Log status change
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

            if (newStatus === 'cancelled') {
                try {
                    await dispatchAppNotification({
                        orderId: String(id),
                        title: `Venda cancelada - ${customerName}`,
                        message: `O pedido #${formatOrderCode(merged)} foi cancelado e a saída de estoque será estornada.`,
                        type: 'order_edited',
                        scheduleText: schedText,
                        orderData: merged,
                    });
                } catch (notificationErr) {
                    console.error('[OrderUpdate] Erro ao notificar cancelamento:', notificationErr);
                }
            }

            const { inventoryAutomation } = getSettings();
            const isAutoWithdrawalStatus = inventoryAutomation?.autoWithdrawalOnStatus?.includes(newStatus) || ['scheduled', 'fulfilled'].includes(newStatus);

            // Uma devolução só retorna o estoque quando é efetivamente atendida.
            if (merged.orderType === 'return' && newStatus === 'fulfilled' && !merged.returnStockProcessed) {
                try {
                    const processed = await processReturnInventoryEntries(id, merged);
                    if (processed) {
                        merged.returnStockProcessed = true;
                        await supabase
                            .from(TABLE_NAME)
                            .update({
                                order_data: { ...merged, status: newStatus, returnStockProcessed: true },
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', id);
                    }
                } catch (returnStockErr) {
                    console.error("[OrderUpdate] Erro ao lançar entrada da devolução:", returnStockErr);
                    throw returnStockErr;
                }
            }
            // Auto-reversal: order is being cancelled (always wipe out linked moves and set stockProcessed: false)
            else if (newStatus === 'cancelled') {
                try {
                    const orderCode = formatOrderCode(merged);
                    const customerName = merged.customerData?.fullName || (merged as any).customerName || '';
                    const cancelReason = customerName
                        ? `Cancelamento da venda #${orderCode} - ${customerName}`
                        : `Cancelamento da venda #${orderCode}`;
                    await cancelInventoryMovesByRelatedEntity(id, 'sales_order', cancelReason);
                    merged.stockProcessed = false;
                    if (merged.orderType === 'return') {
                        merged.returnStockProcessed = false;
                    }
                    
                    await supabase
                        .from(TABLE_NAME)
                        .update({ 
                            order_data: {
                                ...merged,
                                status: newStatus,
                                stockProcessed: false,
                                ...(merged.orderType === 'return' ? { returnStockProcessed: false } : {})
                            },
                            updated_at: new Date().toISOString() 
                        })
                        .eq('id', id);
                } catch (reversalErr) {
                    console.error("[OrderUpdate] Erro ao cancelar movimentações de estoque:", reversalErr);
                }
            } 
            // Auto-withdrawal: new status triggers stock deduction and order is in compliance
            else if (isAutoWithdrawalStatus && (!merged.stockProcessed || oldStatus === 'cancelled')) {
                try {
                    const updatedOrder = await handleStockAndBusinessRules(id, { ...merged, status: newStatus, stockProcessed: false }, true);
                    if (updatedOrder.stockProcessed) {
                        merged.stockProcessed = true;
                        await supabase
                            .from(TABLE_NAME)
                            .update({ 
                                order_data: { ...merged, status: newStatus, stockProcessed: true }, 
                                updated_at: new Date().toISOString() 
                            })
                            .eq('id', id);
                    }
                } catch (stockErr) {
                    console.error("[OrderUpdate] Erro ao processar estoque automático (saída):", stockErr);
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
        // Sync customer data back to CRM if applicable
        if (merged.customerData?.id) {
            try {
                const { updatePerson } = await import("./personService");
                await updatePerson('customers', merged.customerData.id, {
                    phone: merged.customerData.phone,
                    marketingOrigin: merged.marketingOrigin as any
                });
            } catch (syncErr) {
                console.error("[OrderUpdate] Error syncing customer data to CRM:", syncErr);
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

        if (returnOrder.status === 'fulfilled' || returnOrder.returnStockProcessed) {
            throw new Error("Uma devolução atendida não pode ser desfeita. Gere um novo pedido de venda para corrigir a operação.");
        }

        // Devoluções do fluxo atual não alteram os itens nem o status da venda original.
        // Ao desfazê-las, basta remover a devolução (e estornar sua entrada, se já atendida).
        if (returnOrder.returnStockProcessed !== undefined) {
            await permanentDeleteOrder(returnOrder.id!);
            return;
        }

        // 1. Merge items back
        const restoredItems = [...originalOrder.items];
        returnOrder.items.forEach(retItem => {
            const index = restoredItems.findIndex(i => (i as any).id === (retItem as any).id);
            if (index !== -1) {
                // Se o item já existir no original (devolução parcial), somamos a quantidade
                restoredItems[index] = {
                    ...restoredItems[index],
                    quantity: restoredItems[index].quantity + retItem.quantity,
                    totalValue: (restoredItems[index].quantity + retItem.quantity) * restoredItems[index].unitPrice
                } as any;
            } else {
                // Se o item não existir (devolução total anterior), adicionamos de volta
                restoredItems.push(retItem);
            }
        });

        // 2. Prepare original order update
        const totalItemsValue = restoredItems.reduce((acc, i) => acc + ((i as any).totalValue || (i.quantity * i.unitPrice) || 0), 0);
        const subtotal = totalItemsValue + (originalOrder.shipping?.value || 0);
        const totalDiscount = ((originalOrder.paymentsSummary as any)?.discount || 0);
        const totalOrderValue = subtotal - totalDiscount;

        const originalUpdate: Partial<Order> = {
            items: restoredItems,
            returnOrderId: undefined as any, // Limpa o vínculo
            paymentsSummary: {
                ...originalOrder.paymentsSummary,
                totalValue: totalItemsValue,
                subtotal,
                totalOrderValue
            } as any,
            itemsSummary: {
                totalItems: restoredItems.length,
                totalQuantity: restoredItems.reduce((acc, i) => acc + i.quantity, 0),
            } as any
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
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        const frequency: Record<string, number> = {};
        
        data?.forEach((row: any) => {
            const observation = row.order_data?.observation;
            if (observation) {
                const tags = splitNoticeTags(observation);
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
        const baseQuery = () => supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });

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

        return Array.from(uniqueOrders.values()).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    } catch (error) {
        console.error("Erro ao buscar pedidos por produto:", error);
        return [];
    }
};

/**
 * Busca todos os pedidos de um cliente específico (sem real-time)
 */
export const getOrdersByCustomerInfo = async (fullName: string, phone?: string, email?: string): Promise<Order[]> => {
    try {
        const queryPromises: any[] = [];
        const baseQuery = () => supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });

        if (fullName) {
            queryPromises.push(baseQuery().contains('order_data', { customerData: { fullName } }));
        }
        
        if (phone && phone.trim() !== '') {
            queryPromises.push(baseQuery().contains('order_data', { customerData: { phone } }));
        }

        if (email && email.trim() !== '') {
            queryPromises.push(baseQuery().contains('order_data', { customerData: { email } }));
        }

        if (queryPromises.length === 0) return [];

        const results = await Promise.all(queryPromises);
        const uniqueOrders = new Map<string, Order>();

        results.forEach(res => {
            if (res.data) {
                res.data.forEach((row: any) => {
                    const rawData = { ...(row.order_data || {}), id: String(row.id) } as Order;
                    if (!rawData.deleted && !uniqueOrders.has(rawData.id!)) {
                        uniqueOrders.set(rawData.id!, capitalizeOrder(rawData));
                    }
                });
            }
        });

        const finalOrders = Array.from(uniqueOrders.values()).filter(o => 
            o.customerData?.fullName?.toLowerCase() === fullName.toLowerCase() ||
            (phone && o.customerData?.phone === phone) ||
            (email && o.customerData?.email === email)
        );

        return finalOrders.sort((a, b) => Number(b.id) - Number(a.id));
    } catch (error) {
        console.error("Erro ao buscar pedidos por cliente:", error);
        return [];
    }
};

/**
 * Busca dados enxutos de pedidos apenas com informações de clientes
 * Usado para o modal de busca rápida e listagens enxutas.
 */
export const getOrdersCustomerDataOnly = async (): Promise<{ id: string, date: string, customerData: any, deleted: boolean }[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, date, order_data->customerData, order_data->deleted');
        
        if (error) throw error;
        
        return (data || []).map((row: any) => ({
            id: String(row.id),
            date: row.date || (row.order_data as any)?.date || '',
            customerData: (row.order_data as any)?.customerData || {},
            deleted: (row.order_data as any)?.deleted === true
        }));
    } catch (e) {
        console.error("Erro ao buscar dados enxutos de clientes nos pedidos:", e);
        return [];
    }
};

export const fetchOrderById = async (id: string): Promise<Order | null> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data) return null;
        return capitalizeOrder({ ...(data.order_data || {}), id: String(data.id) } as Order);
    } catch (e) {
        console.error(`[fetchOrderById] Erro ao buscar pedido #${id}:`, e);
        return null;
    }
};

