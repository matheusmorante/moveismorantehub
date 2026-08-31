import type Order from '../types/order.type';
import { supabase } from './supabaseConfig';

const MAX_ORDER_CODE = 999999;

export const getOrderIndex = (order?: Partial<Order> | Record<string, any>): number | null => {
    if (!order) return null;
    const rawValue = 
        order.orderIndex ?? 
        (order as any).order_index ?? 
        (order as any).order_data?.orderIndex ?? 
        (order as any).order_data?.order_index ?? 
        (order as any).orderNumber ?? 
        (order as any).order_number ?? 
        order.id;

    const value = Number(rawValue);
    return Number.isInteger(value) && value > 0 && value <= MAX_ORDER_CODE ? value : null;
};

/** The human-facing code is always the six-digit sequential order index, never the UUID. */
export const formatOrderCode = (order?: Partial<Order> | Record<string, any>): string => {
    const orderIndex = getOrderIndex(order);
    if (orderIndex) {
        return String(orderIndex).padStart(6, '0');
    }
    return '000000';
};

/**
 * Retorna o próximo número sequencial de 6 dígitos para o pedido de venda.
 */
export const getNextOrderIndex = async (): Promise<number> => {
    try {
        const { data: generatedIndex, error: sequenceError } = await supabase.rpc('next_order_index');
        const sequenceValue = Number(generatedIndex);
        if (!sequenceError && Number.isInteger(sequenceValue) && sequenceValue > 0 && sequenceValue <= MAX_ORDER_CODE) {
            return sequenceValue;
        }
    } catch { }

    const { data, error } = await supabase.from('orders').select('id, order_data');
    if (error) {
        console.error("Erro ao buscar pedidos para calcular próximo código:", error);
        return 1;
    }

    const highestIndex = (data || []).reduce((highest, row: any) => {
        const index = getOrderIndex({ ...row.order_data, id: row.id });
        return index && index > highest ? index : highest;
    }, 0);

    const nextIndex = highestIndex + 1;
    if (nextIndex > MAX_ORDER_CODE) throw new Error('O limite de 999999 códigos de pedido foi atingido.');
    return nextIndex;
};
