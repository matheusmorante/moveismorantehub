import Order from "../types/order.type";
import { supabase } from "./supabaseConfig";

/** Atualiza flags visuais com base em movimentações efetivas vinculadas ao pedido. */
export const applyActualInventoryStatus = async (orders: Order[]): Promise<Order[]> => {
    const orderIds = orders.map(order => order.id).filter(Boolean) as string[];
    if (!orderIds.length) return orders;

    const { data, error } = await supabase
        .from('inventory_moves')
        .select('order_id, type, status')
        .in('order_id', orderIds);

    if (error) {
        console.error('[OrderInventoryStatus] Erro ao consultar movimentações:', error);
        return orders;
    }

    const effectiveEntries = new Set<string>();
    const effectiveExits = new Set<string>();
    (data || []).forEach((move: any) => {
        if (!move.order_id || ['reversed', 'cancelled'].includes(move.status)) return;
        if (move.type === 'entry') effectiveEntries.add(String(move.order_id));
        if (move.type === 'exit' || move.type === 'withdrawal') effectiveExits.add(String(move.order_id));
    });

    return orders.map(order => {
        if (order.orderType === 'return') return { ...order, returnStockProcessed: effectiveEntries.has(order.id || '') };
        if (order.orderType === 'sale' || order.orderType === 'showroom' || !order.orderType) return { ...order, stockProcessed: effectiveExits.has(order.id || '') };
        return order;
    });
};
