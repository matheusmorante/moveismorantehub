import Order from "../types/order.type";
import { supabase } from "./supabaseConfig";
import { isEffectiveInventoryMove } from './movingAverageCostRules';

/** Atualiza flags visuais com base em movimentações efetivas ou estornadas vinculadas ao pedido. */
export const applyActualInventoryStatus = async (orders: Order[]): Promise<Order[]> => {
    const orderIds = orders.map(order => order.id).filter(Boolean) as string[];
    if (!orderIds.length) return orders;

    const { data, error } = await supabase
        .from('inventory_moves')
        .select('order_id, type, observation, reason, status')
        .in('order_id', orderIds);

    if (error) {
        console.error('[OrderInventoryStatus] Erro ao consultar movimentações:', error);
        return orders;
    }

    const effectiveEntries = new Set<string>();
    const effectiveExits = new Set<string>();
    const reversedEntries = new Set<string>();
    const reversedExits = new Set<string>();

    (data || []).forEach((move: any) => {
        if (!move.order_id) return;
        const isEffective = isEffectiveInventoryMove(move);
        const orderIdStr = String(move.order_id);

        if (isEffective) {
            if (move.type === 'entry') effectiveEntries.add(orderIdStr);
            if (move.type === 'exit' || move.type === 'withdrawal') effectiveExits.add(orderIdStr);
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

        if (order.orderType === 'return') {
            return {
                ...order,
                returnStockProcessed: hasEffectiveEntry,
                returnStockReversed: hasReversedEntry
            };
        }
        if (order.orderType === 'sale' || order.orderType === 'showroom' || !order.orderType) {
            return {
                ...order,
                stockProcessed: hasEffectiveExit,
                stockReversed: hasReversedExit
            };
        }
        return order;
    });
};
