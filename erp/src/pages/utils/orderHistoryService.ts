import Order from "../types/order.type";
import Shipping from "../types/Shipping.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { cancelInventoryMovesByRelatedEntity } from '@/pages/utils/inventoryService';
import { getSettings } from '@/pages/utils/settingsService';
import { formatOrderCode, getNextOrderIndex, getOrderIndex, resolveOrderIndexForUpdate } from './orderCode';
import { processReturnInventoryEntries } from './returnInventoryService';
import { canMaintainSaleStock, getChangedSaleItems, isTemporarySaleItemReconciliation, reverseSaleItemMoves, syncLinkedReturnProductReferences } from './saleItemInventorySync';
import { isPartialSaleStockMovement, isStockEligibleSaleItem } from './saleInventoryRules';
import { isEffectiveInventoryMove } from './movingAverageCostRules';
import { dispatchAppNotification } from '@/pages/utils/pushNotificationService';
import {
    getOrderAssemblyKinds,
    notifyNewAssemblies,
    notifyNewSaleAndAssemblies,
} from '@/pages/utils/orderEventNotificationService';
import {
    detectOrderChangedAreas,
    formatOrderChangeNotification,
    shouldNotifyOrderChange
} from '@/pages/utils/orderChangeDetector';
import { 
    resolveOrderCustomerSnapshot, 
    buildOrderPersistencePayload 
} from './orderSnapshotResolution';
import { formatOrderSchedulingText, resolveCompletedOrderStatus } from './orderSchedulingStatus';
import { handleStockAndBusinessRules, manuallyReverseStock } from './orderStockOperations';
import { 
    getNoticeFrequency, 
    getOrdersByProductId, 
    getOrdersByCustomerInfo, 
    getOrdersCustomerDataOnly, 
    fetchOrderById 
} from './orderSearchQueries';
import { 
    fetchOrdersPage, 
    subscribeToOrders, 
    enrichOrdersWithPeopleOrigins 
} from './orderSyncQueries';
import { 
    moveToTrash as moveToTrashOp, 
    restoreOrder as restoreOrderOp, 
    permanentDeleteDraftOrder, 
    undoReturn as undoReturnOp 
} from './orderLifecycleOperations';

// Re-exports canônicos mantendo retrocompatibilidade 100% dos consumidores
export {
    formatOrderSchedulingText,
    resolveCompletedOrderStatus,
    handleStockAndBusinessRules,
    manuallyReverseStock,
    getNoticeFrequency,
    getOrdersByProductId,
    getOrdersByCustomerInfo,
    getOrdersCustomerDataOnly,
    fetchOrderById,
    fetchOrdersPage,
    subscribeToOrders,
    permanentDeleteDraftOrder,
};

const TABLE_NAME = "orders";

export const saveOrder = async (order: Order): Promise<string> => {
    if (order.id) {
        await updateOrder(order.id, order);
        return order.id;
    }

    try {
        let orderToSave = await resolveOrderCustomerSnapshot(order);
        delete orderToSave.id;
        orderToSave.deleted = false;
        orderToSave.deletedAt = null;

        // Garantir atribuição de código sequencial único de 6 dígitos
        if (!orderToSave.orderIndex) {
            const nextIndex = await getNextOrderIndex();
            orderToSave.orderIndex = nextIndex;
            orderToSave.orderNumber = nextIndex;
        }
        if (!getOrderIndex(orderToSave)) {
            throw new Error('Não foi possível gerar um código válido. O pedido não foi salvo.');
        }

        // Se o cliente não tem ID, mas tem nome e não é Consumidor Final, cadastra no CRM
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
                if (!savedPerson?.id) {
                    throw new Error('O cadastro do cliente não retornou um identificador válido.');
                }
                orderToSave.customerData.id = savedPerson.id;
            } catch (savePersonErr) {
                console.error("[OrderCreate] Erro ao cadastrar cliente no CRM:", savePersonErr);
                throw new Error('Não foi possível cadastrar o cliente. O pedido não foi salvo.');
            }
        }

        const insertPayload = buildOrderPersistencePayload(orderToSave);
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([insertPayload])
            .select('id, order_data')
            .single();

        if (error) throw error;
        const rowId = (data as any)?.id;
        const persistedIndex = getOrderIndex((data as any)?.order_data);
        if (!rowId || persistedIndex !== orderToSave.orderIndex) {
            throw new Error('O banco não confirmou o código do pedido. O cadastro foi interrompido.');
        }

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

        // Gestão de estoque e regras de negócio
        try {
            const updatedOrder = await handleStockAndBusinessRules(rowId, orderToSave);
            if (updatedOrder.stockProcessed) {
                await updateOrder(String(rowId), { stockProcessed: true, items: updatedOrder.items }, updatedOrder);
            }
        } catch (stockErr) {
            console.error('[OrderCreate] Erro nas regras de negócio/estoque (pós-insert, best-effort):', stockErr);
        }

        // Devolução cadastrada (agendada ou atendida): entrada de estoque imediata
        if (orderToSave.orderType === 'return' && ['scheduled', 'fulfilled'].includes(orderToSave.status || '') && !orderToSave.returnStockProcessed) {
            try {
                const processed = await processReturnInventoryEntries(String(rowId), orderToSave);
                if (processed) {
                    orderToSave.returnStockProcessed = true;
                    await supabase
                        .from(TABLE_NAME)
                        .update({
                            order_data: { ...orderToSave, returnStockProcessed: true },
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', rowId);
                }
            } catch (returnErr) {
                console.error('[OrderCreate] Erro ao processar estoque de devolução (pós-insert, best-effort):', returnErr);
            }
        }

        if (orderToSave.customerData?.id) {
            void (async () => {
                try {
                    const { updatePerson } = await import("./personService");
                    await updatePerson('customers', orderToSave.customerData.id, {
                        phone: orderToSave.customerData.phone,
                        marketingOrigin: orderToSave.marketingOrigin as any
                    });
                } catch (syncErr) {
                    console.error('[OrderCreate] Erro ao sincronizar cliente no CRM (pós-insert, best-effort):', syncErr);
                }
            })();
        }

        // Notificação em tempo real / push
        if (orderToSave.status && orderToSave.status !== 'draft') {
            void (async () => {
                try {
                    const schedText = formatOrderSchedulingText(orderToSave.shipping, orderToSave);
                    await notifyNewSaleAndAssemblies({
                        orderId: String(rowId),
                        order: orderToSave,
                        scheduleText: schedText,
                    });
                } catch (notifyErr) {
                    console.error('[OrderCreate] Erro ao notificar app (pós-insert, best-effort):', notifyErr);
                }
            })();
        }

        return String(rowId);
    } catch (error) {
        console.error("Erro ao salvar o pedido: ", error);
        throw error;
    }
};

export const updateOrder = async (
    id: string,
    orderToUpdate: Partial<Order>,
    currentOrder?: Order
): Promise<void> => {
    try {
        let merged: any;
        let previousOrderData: any = currentOrder || null;

        const cleanUpdates: any = {};
        for (const [k, v] of Object.entries(orderToUpdate)) {
            if (v !== undefined) {
                cleanUpdates[k] = v;
            }
        }

        if (currentOrder) {
            const { id: _id, ...rest } = { ...currentOrder, ...cleanUpdates } as any;
            merged = rest;
        } else {
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
            const { id: _id, ...rest } = { ...(current.order_data || {}), ...cleanUpdates } as any;
            merged = rest;
        }

        const persistedCodeSource = getOrderIndex(previousOrderData) ? previousOrderData : currentOrder;
        const existingCode = resolveOrderIndexForUpdate(persistedCodeSource, cleanUpdates);
        if (existingCode) {
            merged.orderIndex = existingCode;
            merged.orderNumber = existingCode;
        } else {
            const newIndex = await getNextOrderIndex();
            merged.orderIndex = newIndex;
            merged.orderNumber = newIndex;
        }

        merged = await resolveOrderCustomerSnapshot(merged as Order);
        if (merged.id) delete merged.id;

        const previousStatus = previousOrderData?.status;
        if (orderToUpdate.status === 'draft' && previousStatus && previousStatus !== 'draft') {
            throw new Error('Um pedido já cadastrado não pode voltar para rascunho.');
        }
        if (previousStatus === 'cancelled' && orderToUpdate.status && orderToUpdate.status !== 'cancelled') {
            throw new Error('Um pedido cancelado não pode ter o status alterado. Duplique o pedido para criar uma nova venda.');
        }

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

        const updatePayload = buildOrderPersistencePayload(merged);
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(updatePayload)
            .eq('id', id);

        if (error) throw error;

        if (merged.orderType === 'sale' && canMaintainSaleStock(merged) && merged.status !== 'cancelled') {
            const orderCode = formatOrderCode(merged);
            const detectedItemChanges = previousOrderData ? getChangedSaleItems(previousOrderData, merged) : [];

            const reconciledItems = detectedItemChanges
                .filter(({ previous, current }) => isTemporarySaleItemReconciliation(previous, current))
                .map(({ current }) => current!)
                .filter(item => isStockEligibleSaleItem(item));

            if (reconciledItems.length > 0) {
                await handleStockAndBusinessRules(id, {
                    ...merged,
                    items: reconciledItems,
                    stockProcessed: false,
                    inventoryMovementNote: 'Produto cadastrado durante a conciliação do pedido.',
                }, true, true);
                await syncLinkedReturnProductReferences(id, previousOrderData, merged);
            }

            const changedItems = detectedItemChanges.filter(({ previous, current }) => !isTemporarySaleItemReconciliation(previous, current));
            if (previousOrderData?.stockProcessed && changedItems.length > 0) {
                for (const change of changedItems) {
                    if (change.previous) {
                        await reverseSaleItemMoves(id, change.previous, `Item alterado no pedido de venda #${orderCode}.`);
                    }
                    if (change.current && isStockEligibleSaleItem(change.current)) {
                        await handleStockAndBusinessRules(id, {
                            ...merged,
                            items: [change.current],
                            stockProcessed: false,
                            inventoryMovementNote: `Item alterado no pedido de venda #${orderCode}.`,
                        } as any, true);
                    }
                }
            }

            const { data: dbMoves } = await supabase
                .from('inventory_moves')
                .select('product_id, observation, reason, type')
                .eq('order_id', id)
                .in('type', ['exit', 'withdrawal']);

            const effectiveMovedSet = new Set<string>();
            (dbMoves || []).forEach((move: any) => {
                if (isEffectiveInventoryMove(move) && move.product_id) {
                    effectiveMovedSet.add(String(move.product_id));
                }
            });

            const eligibleItems = (merged.items || []).filter(isStockEligibleSaleItem);
            const missingExitItems = eligibleItems.filter(item => !effectiveMovedSet.has(String(item.productId)));

            if (missingExitItems.length > 0) {
                await handleStockAndBusinessRules(id, {
                    ...merged,
                    items: missingExitItems,
                    stockProcessed: false,
                    inventoryMovementNote: 'Baixa de estoque gerada ao salvar a edição do pedido.',
                }, true, true);

                missingExitItems.forEach(item => {
                    effectiveMovedSet.add(String(item.productId));
                });
            }

            const hasAnyMovement = effectiveMovedSet.size > 0;
            const isPartial = isPartialSaleStockMovement(merged, effectiveMovedSet);

            merged.stockProcessed = hasAnyMovement;
            merged.movedProductIds = Array.from(effectiveMovedSet);
            merged.isPartialStockProcessed = isPartial;

            await supabase.from(TABLE_NAME).update({
                order_data: merged,
                updated_at: new Date().toISOString(),
            }).eq('id', id);
        }

        const oldStatus = previousStatus;
        const newStatus = orderToUpdate.status || merged.status || oldStatus;
        const customerName = merged.customerData?.fullName || 'Cliente';
        const schedText = formatOrderSchedulingText(merged.shipping, merged);

        const isFromDraftOrNew = (!oldStatus || oldStatus === 'draft') && newStatus && newStatus !== 'draft';
        if (isFromDraftOrNew) {
            void notifyNewSaleAndAssemblies({ orderId: String(id), order: merged, scheduleText: schedText })
                .catch(err => console.error('[OrderUpdate] Erro ao notificar pedido agendado:', err));
        }

        if (!isFromDraftOrNew && previousOrderData) {
            const previousKinds = new Set(getOrderAssemblyKinds(previousOrderData));
            const newKinds = getOrderAssemblyKinds(merged).filter(kind => !previousKinds.has(kind));
            if (newKinds.length > 0) {
                void notifyNewAssemblies({ orderId: String(id), order: merged, scheduleText: schedText, kinds: newKinds })
                    .catch(err => console.error('[OrderUpdate] Erro ao notificar nova montagem:', err));
            }
        }

        const changedAreas = detectOrderChangedAreas(previousOrderData, merged);
        if (changedAreas.length > 0 && shouldNotifyOrderChange(oldStatus)) {
            const notifData = formatOrderChangeNotification(customerName, changedAreas);
            void dispatchAppNotification({
                orderId: String(id), title: notifData.title, message: notifData.message,
                type: notifData.type, scheduleText: schedText, orderData: merged
            }).catch(err => console.error('[OrderUpdate] Erro ao notificar alteração do pedido:', err));
        }

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
                void dispatchAppNotification({
                    orderId: String(id), title: `Venda cancelada - ${customerName}`,
                    message: `O pedido #${formatOrderCode(merged)} foi cancelado e a saída de estoque será estornada.`,
                    type: 'order_edited', scheduleText: schedText, orderData: merged,
                }).catch(notificationErr => console.error('[OrderUpdate] Erro ao notificar cancelamento:', notificationErr));
            }

            const { inventoryAutomation } = getSettings();
            const isAutoWithdrawalStatus = inventoryAutomation?.autoWithdrawalOnStatus?.includes(newStatus) || ['scheduled', 'fulfilled'].includes(newStatus);

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
            } else if (newStatus === 'cancelled') {
                try {
                    const orderCode = formatOrderCode(merged);
                    const customerName = merged.customerData?.fullName || (merged as any).customerName || '';
                    const cancelReason = customerName
                        ? `Cancelamento da venda #${orderCode} - ${customerName}`
                        : `Cancelamento da venda #${orderCode}`;
                    await cancelInventoryMovesByRelatedEntity(id, 'sales_order', cancelReason);
                    merged.stockProcessed = false;
                    merged.stockReversed = true;
                    if (merged.orderType === 'return') {
                        merged.returnStockProcessed = false;
                        merged.returnStockReversed = true;
                    }
                    
                    await supabase
                        .from(TABLE_NAME)
                        .update({ 
                            order_data: {
                                ...merged,
                                status: newStatus,
                                stockProcessed: false,
                                stockReversed: true,
                                ...(merged.orderType === 'return' ? { returnStockProcessed: false, returnStockReversed: true } : {})
                            },
                            updated_at: new Date().toISOString() 
                        })
                        .eq('id', id);
                } catch (reversalErr) {
                    console.error("[OrderUpdate] Erro ao cancelar movimentações de estoque:", reversalErr);
                }
            } else if (isAutoWithdrawalStatus && (!merged.stockProcessed || oldStatus === 'cancelled')) {
                try {
                    const updatedOrder = await handleStockAndBusinessRules(id, { ...merged, status: newStatus, stockProcessed: false }, true);
                    if (updatedOrder.stockProcessed) {
                        merged.stockProcessed = true;
                        await supabase
                            .from(TABLE_NAME)
                            .update({ 
                                order_data: { ...updatedOrder, status: newStatus, stockProcessed: true },
                                updated_at: new Date().toISOString() 
                            })
                            .eq('id', id);
                    }
                } catch (stockErr) {
                    console.error("[OrderUpdate] Erro ao processar estoque automático (saída):", stockErr);
                }
            }
        } else if (!merged.stockProcessed) {
            try {
                const updatedOrder = await handleStockAndBusinessRules(id, merged);
                if (updatedOrder.stockProcessed) {
                    await supabase
                        .from(TABLE_NAME)
                        .update({ 
                            order_data: { ...updatedOrder, stockProcessed: true },
                            updated_at: new Date().toISOString() 
                        })
                        .eq('id', id);
                }
            } catch (stockErr) {
                console.error("[OrderUpdate] Erro ao processar estoque (manutenção):", stockErr);
            }
        }

        if (merged.customerData?.id) {
            void (async () => {
                try {
                    const { updatePerson } = await import("./personService");
                    await updatePerson('customers', merged.customerData.id, {
                        phone: merged.customerData.phone,
                        marketingOrigin: merged.marketingOrigin as any
                    });
                } catch (syncErr) {
                    console.error("[OrderUpdate] Error syncing customer data to CRM:", syncErr);
                }
            })();
        }
    } catch (error) {
        console.error("Erro ao atualizar o pedido: ", error);
        throw error;
    }
};

export const moveToTrash = (id: string): Promise<void> => moveToTrashOp(id, updateOrder);

export const restoreOrder = (id: string): Promise<void> => restoreOrderOp(id, updateOrder);

export const permanentDeleteOrder = async (id: string): Promise<void> => {
    await moveToTrash(id);
};

export const undoReturn = (order: Order): Promise<void> => undoReturnOp(order, updateOrder);

/** @deprecated Use moveToTrash instead */
export const deleteOrder = moveToTrash;
