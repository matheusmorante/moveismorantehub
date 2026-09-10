import Order from "../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { saveInventoryMove, cancelInventoryMovesByRelatedEntity } from '@/pages/utils/inventoryService';
import { getCurrentMovingAverageUnitCost, reprocessMovingAverageCosts } from './movingAverageCostService';
import { getSettings } from '@/pages/utils/settingsService';
import { formatOrderCode } from './orderCode';
import { getSaleInventoryDate, shouldProcessSaleStock } from './saleItemInventorySync';

/**
 * Lógica centralizada para movimentação de saídas de estoque em vendas.
 * Retorna o pedido atualizado com a flag stockProcessed.
 */
export async function handleStockAndBusinessRules(
    orderId: string,
    order: Order,
    force: boolean = false,
    historical: boolean = false,
): Promise<Order> {
    const settings = getSettings();
    const { inventoryAutomation } = settings;
    const orderToUpdate = { ...order };

    const shouldSubtractStock = shouldProcessSaleStock(
        order,
        inventoryAutomation?.autoWithdrawalOnStatus || [],
        force,
    );

    if (shouldSubtractStock && order.items) {
        let itemsProcessed = 0;

        const orderCode = formatOrderCode(order);
        const customerName = order.customerData?.fullName || (order as any).customerName || '';
        const baseMoveLabel = customerName ? `Saída - Pedido #${orderCode} - ${customerName}` : `Saída - Pedido #${orderCode}`;
        const baseMoveObs = `${customerName ? `Pedido de venda #${orderCode} - ${customerName}` : `Pedido de venda #${orderCode}`}${(order as any).inventoryMovementNote ? ` | ${(order as any).inventoryMovementNote}` : ''}`;
        const movementDate = getSaleInventoryDate(order, historical);

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
                            date: movementDate,
                            label: baseMoveLabel,
                            relatedEntityId: orderId,
                            relatedEntityType: 'sales_order',
                            observation: `${baseMoveObs} | Parte do combo ${item.description}`,
                            status: 'effective'
                        }, currentPartStock);
                    }
                }

                const movingAverageCost = await getCurrentMovingAverageUnitCost(item.productId, item.variationId);
                item.unitCost = movingAverageCost;
                await saveInventoryMove({
                    productId: item.productId,
                    variationId: item.variationId,
                    productDescription: item.description,
                    type: 'withdrawal',
                    quantity: item.quantity,
                    date: movementDate,
                    label: baseMoveLabel,
                    relatedEntityId: orderId,
                    relatedEntityType: 'sales_order',
                    observation: movingAverageCost === undefined ? `${baseMoveObs} | CMV não apurado: sem custo de aquisição disponível` : baseMoveObs,
                    unitCost: movingAverageCost,
                    unitPrice: item.unitPrice,
                    status: 'effective'
                }, currentStock);
                if (historical) {
                    await reprocessMovingAverageCosts(item.productId, item.variationId);
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
 * Reverte manualmente movimentações de saída de um pedido de venda.
 */
export async function manuallyReverseStock(orderId: string): Promise<void> {
    await cancelInventoryMovesByRelatedEntity(orderId, 'sales_order');
}
