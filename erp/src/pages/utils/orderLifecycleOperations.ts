import Order from "../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { assertDeletedOrderId, canPermanentlyDeleteDraft } from './orderDeletionRules';
import { buildCancelledReturn, clearReturnLink } from './returnCancellation';

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
        .select('order_data')
        .eq('id', id)
        .single();
    if (fetchError) throw fetchError;
    if (!canPermanentlyDeleteDraft(row?.order_data?.status)) {
        throw new Error('Somente pedidos em rascunho podem ser excluídos.');
    }

    const deletedAt = new Date().toLocaleString('pt-BR');
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
            order_data: { ...row.order_data, deleted: true, deletedAt },
            updated_at: new Date().toISOString(),
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
        let originalOrder: Order;
        let returnOrder: Order;

        if (order.orderType === 'return') {
            returnOrder = order;
            if (!order.linkedOrderId) {
                throw new Error("Este pedido de devolução não possui um pedido original vinculado.");
            }

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

        await updateOrderFn(returnOrder.id!, buildCancelledReturn(returnOrder), returnOrder);
        await updateOrderFn(originalOrder.id!, clearReturnLink(), originalOrder);
    } catch (error) {
        console.error("Erro ao desfazer devolução:", error);
        throw error;
    }
};
