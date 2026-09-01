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
 * Garante unicidade e nunca permite pedidos sem código.
 */
export const getNextOrderIndex = async (): Promise<number> => {
    // 1. Tenta obter via RPC da sequence do Postgres
    try {
        const { data: generatedIndex, error } = await supabase.rpc('next_order_index');
        if (!error && generatedIndex != null) {
            const sequenceValue = Number(generatedIndex);
            if (Number.isInteger(sequenceValue) && sequenceValue > 0 && sequenceValue <= MAX_ORDER_CODE) {
                return sequenceValue;
            }
        }
    } catch (rpcErr) {
        console.warn('[orderCode] RPC next_order_index indisponível, utilizando cálculo direto do banco:', rpcErr);
    }

    // 2. Fallback resiliente: busca o maior orderIndex existente diretamente no banco
    try {
        const { data: orders, error: fetchErr } = await supabase
            .from('orders')
            .select('id, order_data, created_at')
            .order('created_at', { ascending: false })
            .limit(200);

        if (fetchErr) {
            throw new Error(`Erro ao consultar pedidos existentes: ${fetchErr.message}`);
        }

        let maxCode = 0;
        for (const o of (orders || [])) {
            const num = getOrderIndex(o.order_data || o);
            if (num && num > maxCode) {
                maxCode = num;
            }
        }

        if (maxCode === 0) {
            const { data: allOrders, error: allErr } = await supabase
                .from('orders')
                .select('order_data');
            if (allErr) throw allErr;
            for (const o of (allOrders || [])) {
                const num = getOrderIndex(o.order_data || o);
                if (num && num > maxCode) maxCode = num;
            }
        }

        const nextCode = maxCode + 1;
        if (nextCode <= 0 || nextCode > MAX_ORDER_CODE) {
            throw new Error('Limite máximo de código de pedidos (999999) excedido.');
        }

        return nextCode;
    } catch (err: any) {
        console.error('[orderCode] Falha crítica ao gerar código sequencial de pedido:', err);
        throw new Error(`Não foi possível gerar um código único para o pedido: ${err.message || err}`);
    }
};
