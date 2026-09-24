import Order from "../../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { cancelInventoryMovesByRelatedEntity } from '@/pages/utils/inventoryService';
import { getSettings } from '@/pages/utils/settingsService';
import { formatOrderCode } from '../orderCode';
import { processReturnInventoryEntries } from '../returnInventoryService';
import { handleStockAndBusinessRules } from '../orderStockOperations';

const TABLE_NAME = "orders";

/**
 * Registra a transição de status na tabela de auditoria order_status_history.
 */
export const recordOrderStatusHistory = async (
    orderId: string,
    oldStatus: Order['status'] | null | undefined,
    newStatus: Order['status'],
    changedBy: string
): Promise<void> => {
    try {
        await supabase.from('order_status_history').insert([{
            order_id: String(orderId),
            old_status: oldStatus || null,
            new_status: newStatus,
            changed_by: changedBy || 'system',
        }]);
    } catch (historyErr) {
        console.error("[OrderStatusWorkflow] Erro ao gravar histórico de status:", historyErr);
    }
};

/**
 * Processa efeitos colaterais de estoque decorrentes de alteração de status ou manutenção preventiva.
 */
export const handleOrderStatusStockSideEffects = async (
    orderId: string,
    merged: Order,
    oldStatus?: Order['status'],
    newStatus?: Order['status']
): Promise<void> => {
    const isStatusChanged = newStatus && oldStatus !== newStatus;

    if (isStatusChanged) {
        const { inventoryAutomation } = getSettings();
        const isAutoWithdrawalStatus =
            inventoryAutomation?.autoWithdrawalOnStatus?.includes(newStatus) ||
            ['scheduled', 'fulfilled'].includes(newStatus);

        // Devolução que se torna atendida
        if (merged.orderType === 'return' && newStatus === 'fulfilled' && !merged.returnStockProcessed) {
            try {
                const processed = await processReturnInventoryEntries(orderId, merged);
                if (processed) {
                    merged.returnStockProcessed = true;
                    await supabase
                        .from(TABLE_NAME)
                        .update({
                            order_data: { ...merged, status: newStatus, returnStockProcessed: true },
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', orderId);
                }
            } catch (returnStockErr) {
                console.error("[OrderStatusWorkflow] Erro ao lançar entrada da devolução:", returnStockErr);
                throw returnStockErr;
            }
            return;
        }

        // Cancelamento de pedido: estorna saídas de estoque
        if (newStatus === 'cancelled') {
            try {
                const orderCode = formatOrderCode(merged);
                const customerName = merged.customerData?.fullName || (merged as any).customerName || '';
                const cancelReason = customerName
                    ? `Cancelamento da venda #${orderCode} - ${customerName}`
                    : `Cancelamento da venda #${orderCode}`;

                await cancelInventoryMovesByRelatedEntity(orderId, 'sales_order', cancelReason);
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
                            ...(merged.orderType === 'return' ? { returnStockProcessed: false, returnStockReversed: true } : {}),
                        },
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', orderId);
            } catch (reversalErr) {
                console.error("[OrderStatusWorkflow] Erro ao cancelar movimentações de estoque:", reversalErr);
            }
            return;
        }

        // Baixa automática de estoque para pedidos agendados ou atendidos
        if (isAutoWithdrawalStatus && (!merged.stockProcessed || oldStatus === 'cancelled')) {
            try {
                const updatedOrder = await handleStockAndBusinessRules(orderId, { ...merged, status: newStatus, stockProcessed: false }, true);
                if (updatedOrder.stockProcessed) {
                    merged.stockProcessed = true;
                    await supabase
                        .from(TABLE_NAME)
                        .update({
                            order_data: { ...updatedOrder, status: newStatus, stockProcessed: true },
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', orderId);
                }
            } catch (stockErr) {
                console.error("[OrderStatusWorkflow] Erro ao processar estoque automático (saída):", stockErr);
            }
            return;
        }
    }

    // Manutenção preventiva de estoque caso o pedido ainda não tenha sido processado
    if (!merged.stockProcessed) {
        try {
            const updatedOrder = await handleStockAndBusinessRules(orderId, merged);
            if (updatedOrder.stockProcessed) {
                await supabase
                    .from(TABLE_NAME)
                    .update({
                        order_data: { ...updatedOrder, stockProcessed: true },
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', orderId);
            }
        } catch (stockErr) {
            console.error("[OrderStatusWorkflow] Erro ao processar estoque (manutenção):", stockErr);
        }
    }
};
