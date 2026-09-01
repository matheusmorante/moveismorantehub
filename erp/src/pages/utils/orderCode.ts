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
        (order as any).order_number;

    const value = Number(rawValue);
    return Number.isInteger(value) && value > 0 && value <= MAX_ORDER_CODE ? value : null;
};

/** The human-facing code is always the six-digit sequential order index, never the UUID. */
export const formatOrderCode = (order?: Partial<Order> | Record<string, any>): string => {
    const orderIndex = getOrderIndex(order);
    if (orderIndex) {
        return String(orderIndex).padStart(6, '0');
    }
    return 'CÓDIGO INVÁLIDO';
};

/**
 * Retorna o próximo número sequencial de 6 dígitos para o pedido de venda.
 */
export const getNextOrderIndex = async (): Promise<number> => {
    const { data: generatedIndex, error } = await supabase.rpc('next_order_index');
    if (error) {
        throw new Error(`Não foi possível gerar o código do pedido: ${error.message}`);
    }

    const sequenceValue = Number(generatedIndex);
    if (!Number.isInteger(sequenceValue) || sequenceValue <= 0 || sequenceValue > MAX_ORDER_CODE) {
        throw new Error('O banco retornou um código de pedido inválido. O pedido não foi salvo.');
    }

    return sequenceValue;
};
