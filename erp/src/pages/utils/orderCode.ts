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
    return 'SEM-CÓDIGO';
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

    throw new Error('Não foi possível gerar o código sequencial do pedido com segurança. Verifique a função atômica next_order_index no banco antes de criar outro pedido.');
};
