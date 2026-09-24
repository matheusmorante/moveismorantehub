import Order from "../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { assertDeletedOrderId, canPermanentlyDeleteDraft } from './orderDeletionRules';
import { buildCancelledReturn, clearReturnLink } from './returnCancellation';
import { mapOrderFromDatabase } from './orderMapper';
import { cancelInventoryMovesByRelatedEntity } from './inventoryService';
import { formatOrderCode } from './orderCode';

const TABLE_NAME = "orders";

export const moveToTrash = async (
    id: string, 
    updateOrderFn: (id: string, updates: Partial<Order>) => Promise<void>
): Promise<void> => {
    try {
        await updateOrderFn(id, {
            deleted: true,
            deletedAt: new Date().toLocaleString('pt-BR')
        } as any);
    } catch (error) {
        console.error("Erro ao mover para lixeira: ", error);
        throw error;
    }
};

export const restoreOrder = async (
    id: string,
    updateOrderFn: (id: string, updates: Partial<Order>) => Promise<void>
): Promise<void> => {
    try {
        await updateOrderFn(id, {
            deleted: false,
            deletedAt: null
        } as any);
    } catch (error) {
        console.error("Erro ao restaurar o pedido: ", error);
        throw error;
    }
};

export const permanentDeleteDraftOrder = async (id: string): Promise<void> => {
    const { data: row, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('status, order_data')
        .eq('id', id)
        .single();
    if (fetchError) throw fetchError;
    const orderStatus = row?.status || row?.order_data?.status;
    if (!canPermanentlyDeleteDraft(orderStatus)) {
        throw new Error('Somente pedidos em rascunho podem ser excluídos.');
    }

    const deletedAt = new Date().toISOString();
    const rawLegacy = row.order_data || {};
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
            deleted: true,
            deleted_at: deletedAt,
            order_data: { ...rawLegacy, deleted: true, deletedAt: new Date().toLocaleString('pt-BR') },
            updated_at: deletedAt,
        })
        .eq('id', id)
        .select('id');
    if (error) throw error;
    assertDeletedOrderId(id, data);
};

export const undoReturn = async (
    order: Order,
    updateOrderFn: (id: string, updates: Partial<Order>, currentOrder?: Order) => Promise<void>
): Promise<void> => {
    if (!order.id) return;
    
    try {
        let originalOrder: Order | undefined;
        let returnOrder: Order;

        if (order.orderType === 'return') {
            returnOrder = order;
            if (order.linkedOrderId) {
                const { data: origRow, error: origError } = await supabase
                    .from(TABLE_NAME)
                    .select('*')
                    .eq('id', order.linkedOrderId)
                    .single();
                
                if (!origError && origRow) {
                    originalOrder = mapOrderFromDatabase(origRow);
                }
            }
        } else {
            originalOrder = order;
            let returnId = originalOrder.returnOrderId;
            
            if (!returnId) {
                const { data: linkedReturns } = await supabase
                    .from(TABLE_NAME)
                    .select('id')
                    .or(`linked_order_id.eq.${originalOrder.id},order_data->>linkedOrderId.eq.${originalOrder.id}`)
                    .eq('order_type', 'return')
                    .limit(1);
                
                if (linkedReturns && linkedReturns.length > 0) {
                    returnId = String(linkedReturns[0].id);
                }
            }

            if (!returnId) {
                throw new Error("Nenhum pedido de devolução vinculado encontrado.");
            }

            const { data: returnRow, error: fetchError } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .eq('id', returnId)
                .single();
                
            if (fetchError || !returnRow) {
                throw new Error("Pedido de devolução não encontrado.");
            }
            returnOrder = mapOrderFromDatabase(returnRow);
        }

        // Se a devolução já foi cancelada anteriormente, apenas limpa o vínculo na venda (idempotente)
        if (returnOrder.status === 'cancelled') {
            if (originalOrder && originalOrder.id) {
                await updateOrderFn(originalOrder.id, clearReturnLink(), originalOrder);
            }
            return;
        }

        // Estornar a movimentação de entrada no estoque gerada por esta devolução
        const orderCode = formatOrderCode(returnOrder);
        const customerName = returnOrder.customerData?.fullName || (returnOrder as any).customerName || '';
        const cancelReason = customerName
            ? `Estorno de devolução #${orderCode} - ${customerName}`
            : `Estorno de devolução #${orderCode}`;

        await cancelInventoryMovesByRelatedEntity(returnOrder.id!, 'sales_order', cancelReason);

        // Atualizar a devolução como cancelada com flags de estorno de estoque
        await updateOrderFn(returnOrder.id!, buildCancelledReturn(returnOrder), returnOrder);

        // Se houver pedido original de venda vinculado, desvincular
        if (originalOrder && originalOrder.id) {
            await updateOrderFn(originalOrder.id, clearReturnLink(), originalOrder);
        }
    } catch (error) {
        console.error("Erro ao desfazer devolução:", error);
        throw error;
    }
};
