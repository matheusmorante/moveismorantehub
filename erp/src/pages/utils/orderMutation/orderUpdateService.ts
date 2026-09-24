import Order from "../../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { getNextOrderIndex, getOrderIndex, resolveOrderIndexForUpdate } from '../orderCode';
import { resolveOrderCustomerSnapshot, buildOrderPersistencePayload } from '../orderSnapshotResolution';
import { validateOrderStatusTransition } from '../orderStatusTransitionRules';
import { ensureCustomerInCrm, syncCustomerToCrmBackground } from './orderCrmSyncService';
import { dispatchOrderUpdateNotifications } from './orderNotificationDispatcher';
import { reconcileSaleItemsStock } from './orderItemStockReconciliation';
import { recordOrderStatusHistory, handleOrderStatusStockSideEffects } from './orderStatusWorkflowService';

const TABLE_NAME = "orders";

/**
 * Atualização completa ou parcial de pedidos com conciliação de estoque, transição de status e CRM.
 */
export const executeUpdateOrder = async (
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

        // 1. Manutenção do código do pedido
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

        // 2. Validação da transição de status
        const previousStatus = previousOrderData?.status;
        const validation = validateOrderStatusTransition(previousStatus, orderToUpdate.status);
        if (!validation.allowed && validation.reason) {
            throw new Error(validation.reason);
        }

        // 3. Garantir cliente no CRM
        const customerId = await ensureCustomerInCrm(merged.customerData, merged.marketingOrigin, false);
        if (customerId && merged.customerData) {
            merged.customerData.id = customerId;
        }

        const updatePayload = buildOrderPersistencePayload(merged);
        const orderItemsPayload = merged.items || [];
        const orderPaymentsPayload = merged.payments || [];

        // 4. Persistência Transacional Atômica
        try {
            const { error: rpcError } = await supabase.rpc('save_order_transaction', {
                p_order_id: String(id),
                p_order_payload: updatePayload,
                p_items: orderItemsPayload,
                p_payments: orderPaymentsPayload,
                p_is_update: true,
            });

            if (rpcError) throw rpcError;
        } catch (rpcErr) {
            console.warn('[OrderUpdate] Falha na RPC transacional, executando fallback de update padrão:', rpcErr);
            const { error } = await supabase
                .from(TABLE_NAME)
                .update(updatePayload)
                .eq('id', id);

            if (error) throw error;
        }

        // 5. Conciliação de itens de venda com o estoque
        await reconcileSaleItemsStock(id, previousOrderData, merged);

        // 6. Notificações de eventos e alterações
        const oldStatus = previousStatus;
        const newStatus = orderToUpdate.status || merged.status || oldStatus;
        dispatchOrderUpdateNotifications(id, previousOrderData, merged, oldStatus, newStatus);

        // 7. Registro de histórico de status
        if (newStatus && oldStatus !== newStatus) {
            await recordOrderStatusHistory(
                id,
                oldStatus,
                newStatus,
                (orderToUpdate as any).seller || (merged as any).seller || 'system'
            );
        }

        // 8. Efeitos colaterais de estoque por status (cancelamento, devolução ou saídas automáticas)
        await handleOrderStatusStockSideEffects(id, merged, oldStatus, newStatus);

        // 9. Sincronização em background do cliente no CRM
        syncCustomerToCrmBackground(
            merged.customerData?.id,
            merged.customerData?.phone,
            merged.marketingOrigin
        );
    } catch (error) {
        console.error("Erro ao atualizar o pedido: ", error);
        throw error;
    }
};
