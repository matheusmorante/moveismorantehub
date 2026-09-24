import Order from "../../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { getNextOrderIndex, getOrderIndex } from '../orderCode';
import { processReturnInventoryEntries } from '../returnInventoryService';
import { handleStockAndBusinessRules } from '../orderStockOperations';
import { resolveOrderCustomerSnapshot, buildOrderPersistencePayload } from '../orderSnapshotResolution';
import { ensureCustomerInCrm, syncCustomerToCrmBackground } from './orderCrmSyncService';
import { dispatchOrderCreationNotifications } from './orderNotificationDispatcher';
import { recordOrderStatusHistory } from './orderStatusWorkflowService';

const TABLE_NAME = "orders";

/**
 * Criação atômica e persistência de pedidos com resolução de cliente, regras de estoque e notificações.
 */
export const executeSaveOrder = async (
    order: Order,
    updateOrderFn: (id: string, partial: Partial<Order>, current?: Order) => Promise<void>
): Promise<string> => {
    if (order.id) {
        await updateOrderFn(order.id, order);
        return order.id;
    }

    try {
        let orderToSave = await resolveOrderCustomerSnapshot(order);
        delete orderToSave.id;
        orderToSave.deleted = false;
        orderToSave.deletedAt = null;

        // 1. Atribuição de código sequencial único de 6 dígitos
        if (!orderToSave.orderIndex) {
            const nextIndex = await getNextOrderIndex();
            orderToSave.orderIndex = nextIndex;
            orderToSave.orderNumber = nextIndex;
        }
        if (!getOrderIndex(orderToSave)) {
            throw new Error('Não foi possível gerar um código válido. O pedido não foi salvo.');
        }

        // 2. Garantir cliente no CRM
        const customerId = await ensureCustomerInCrm(orderToSave.customerData, orderToSave.marketingOrigin, true);
        if (customerId && orderToSave.customerData) {
            orderToSave.customerData.id = customerId;
        }

        const insertPayload = buildOrderPersistencePayload(orderToSave);
        const orderItemsPayload = orderToSave.items || [];
        const orderPaymentsPayload = orderToSave.payments || [];

        let rowId: string | null = null;
        let persistedIndex: number | undefined = undefined;

        // 3. Persistência Transacional Atômica
        try {
            const { data: rpcData, error: rpcError } = await supabase.rpc('save_order_transaction', {
                p_order_id: null,
                p_order_payload: insertPayload,
                p_items: orderItemsPayload,
                p_payments: orderPaymentsPayload,
                p_is_update: false,
            });

            if (rpcError) throw rpcError;
            rowId = (rpcData as any)?.id;
            persistedIndex = Number((rpcData as any)?.order_index || getOrderIndex((rpcData as any)?.order_data));
        } catch (rpcErr) {
            console.warn('[OrderCreate] Falha na RPC transacional, executando fallback padrão:', rpcErr);
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .insert([insertPayload])
                .select('id, order_data')
                .single();

            if (error) throw error;
            rowId = (data as any)?.id;
            persistedIndex = getOrderIndex((data as any)?.order_data) ?? undefined;
        }

        if (!rowId || persistedIndex !== orderToSave.orderIndex) {
            throw new Error('O banco não confirmou o código do pedido. O cadastro foi interrompido.');
        }

        // 4. Histórico de status inicial
        await recordOrderStatusHistory(
            rowId,
            null,
            orderToSave.status || 'draft',
            (orderToSave as any).seller || 'system'
        );

        // 5. Regras de estoque
        try {
            const updatedOrder = await handleStockAndBusinessRules(rowId, orderToSave);
            if (updatedOrder.stockProcessed) {
                await updateOrderFn(String(rowId), { stockProcessed: true, items: updatedOrder.items }, updatedOrder);
            }
        } catch (stockErr) {
            console.error('[OrderCreate] Erro nas regras de negócio/estoque (pós-insert, best-effort):', stockErr);
        }

        // 6. Devolução cadastrada (agendada ou atendida): entrada imediata
        if (
            orderToSave.orderType === 'return' &&
            ['scheduled', 'fulfilled'].includes(orderToSave.status || '') &&
            !orderToSave.returnStockProcessed
        ) {
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

        // 7. Sincronização em background do cliente no CRM
        syncCustomerToCrmBackground(
            orderToSave.customerData?.id,
            orderToSave.customerData?.phone,
            orderToSave.marketingOrigin
        );

        // 8. Disparo de notificações
        dispatchOrderCreationNotifications(rowId, orderToSave);

        return String(rowId);
    } catch (error) {
        console.error("Erro ao salvar o pedido: ", error);
        throw error;
    }
};
