import Order from "../types/order.type";
import { supabase } from "./supabaseConfig";
import { isEffectiveInventoryMove } from './movingAverageCostRules';
import { isPartialSaleStockMovement } from './saleInventoryRules';

/** Atualiza flags visuais com base em movimentações efetivas ou estornadas vinculadas ao pedido. */
export const applyActualInventoryStatus = async (orders: Order[]): Promise<Order[]> => {
    const orderIds = orders.map(order => order.id).filter(Boolean) as string[];
    if (!orderIds.length) return orders;

    const { data, error } = await supabase
        .from('inventory_moves')
        .select('order_id, type, observation, reason, product_id')
        .in('order_id', orderIds);

    if (error) {
        console.error('[OrderInventoryStatus] Erro ao consultar movimentações:', error);
        return orders;
    }

    const effectiveEntries = new Set<string>();
    const effectiveExits = new Set<string>();
    const reversedEntries = new Set<string>();
    const reversedExits = new Set<string>();
    const movedProductsByOrder = new Map<string, Set<string>>();

    (data || []).forEach((move: any) => {
        if (!move.order_id) return;
        const isEffective = isEffectiveInventoryMove(move);
        const orderIdStr = String(move.order_id);

        if (isEffective) {
            if (move.type === 'entry') effectiveEntries.add(orderIdStr);
            if (move.type === 'exit' || move.type === 'withdrawal') effectiveExits.add(orderIdStr);
            if (move.product_id) {
                if (!movedProductsByOrder.has(orderIdStr)) {
                    movedProductsByOrder.set(orderIdStr, new Set());
                }
                movedProductsByOrder.get(orderIdStr)!.add(String(move.product_id));
            }
        } else {
            if (move.type === 'entry') reversedEntries.add(orderIdStr);
            if (move.type === 'exit' || move.type === 'withdrawal') reversedExits.add(orderIdStr);
        }
    });

    return orders.map(order => {
        const orderId = order.id || '';
        const hasEffectiveEntry = effectiveEntries.has(orderId);
        const hasEffectiveExit = effectiveExits.has(orderId);
        const hasReversedEntry = !hasEffectiveEntry && (reversedEntries.has(orderId) || order.status === 'cancelled');
        const hasReversedExit = !hasEffectiveExit && (reversedExits.has(orderId) || order.status === 'cancelled');
        const movedProductIds = movedProductsByOrder.get(orderId);
        const movedProductIdsArray = movedProductIds ? Array.from(movedProductIds) : undefined;

        if (order.orderType === 'return') {
            const updatedOrder: Order = {
                ...order,
                returnStockProcessed: hasEffectiveEntry,
                returnStockReversed: hasReversedEntry,
                movedProductIds: movedProductIdsArray,
            };
            return {
                ...updatedOrder,
                isPartialStockProcessed: isPartialSaleStockMovement(updatedOrder, movedProductIds)
            };
        }
        if (order.orderType === 'sale' || order.orderType === 'showroom' || !order.orderType) {
            const updatedOrder: Order = {
                ...order,
                stockProcessed: hasEffectiveExit,
                stockReversed: hasReversedExit,
                movedProductIds: movedProductIdsArray,
            };
            return {
                ...updatedOrder,
                isPartialStockProcessed: isPartialSaleStockMovement(updatedOrder, movedProductIds)
            };
        }
        return order;
    });
};
