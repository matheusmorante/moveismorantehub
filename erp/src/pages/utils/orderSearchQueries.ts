import Order from "../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from "./formatters";
import { splitNoticeTags } from "./noticeTags";
import { mapOrderFromDatabase } from "./orderMapper";

const TABLE_NAME = "orders";

/**
 * Analisa os últimos pedidos para identificar a frequência de uso de avisos (observações)
 */
export const getNoticeFrequency = async (): Promise<Record<string, number>> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('notes, order_data')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        const frequency: Record<string, number> = {};
        
        data?.forEach((row: any) => {
            const observation = row.notes || row.order_data?.observation;
            if (observation) {
                const tags = splitNoticeTags(observation);
                tags.forEach((tag: string) => {
                    frequency[tag] = (frequency[tag] || 0) + 1;
                });
            }
        });

        return frequency;
    } catch (error) {
        console.error("Erro ao carregar frequência de avisos:", error);
        return {};
    }
};

/**
 * Busca todos os pedidos que contenham um determinado produto/variação.
 * Consulta prioritariamente a tabela normalizada order_items com fallback para o legado.
 */
export const getOrdersByProductId = async (productId: string, variationId?: string): Promise<Order[]> => {
    try {
        let orderIds: string[] = [];

        // 1. Consulta prioritária na tabela normalizada order_items
        if (variationId) {
            const { data: itemRows } = await supabase
                .from('order_items')
                .select('order_id')
                .eq('variation_id', String(variationId));
            if (itemRows) {
                orderIds = itemRows.map((r: any) => String(r.order_id));
            }
        } else if (productId) {
            const { data: itemRows } = await supabase
                .from('order_items')
                .select('order_id')
                .eq('product_id', String(productId));
            if (itemRows) {
                orderIds = itemRows.map((r: any) => String(r.order_id));
            }
        }

        // 2. Se encontrou pedidos via order_items, busca os pedidos diretamente
        if (orderIds.length > 0) {
            const uniqueIds = Array.from(new Set(orderIds));
            const { data: ordersData, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .in('id', uniqueIds)
                .eq('deleted', false)
                .neq('order_type', 'budget')
                .order('created_at', { ascending: false });

            if (!error && ordersData && ordersData.length > 0) {
                return ordersData.map((row: any) => mapOrderFromDatabase(row));
            }
        }

        // Fallback de segurança para assistências técnicas ou registros antigos
        const queryPromises: any[] = [];
        const baseQuery = () => supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });

        if (variationId) {
            queryPromises.push(baseQuery().contains('order_data', { items: [{ variationId: String(variationId) }] }));
            queryPromises.push(baseQuery().contains('order_data', { assistanceItems: [{ variationId: String(variationId) }] }));
        } else if (productId) {
            queryPromises.push(baseQuery().contains('order_data', { items: [{ productId: String(productId) }] }));
            queryPromises.push(baseQuery().contains('order_data', { assistanceItems: [{ productId: String(productId) }] }));
            queryPromises.push(baseQuery().contains('order_data', { assistanceItems: [{ id: String(productId) }] }));
        }

        if (queryPromises.length === 0) return [];

        const results = await Promise.all(queryPromises);
        const uniqueOrders = new Map<string, Order>();

        results.forEach(res => {
            if (res.data) {
                res.data.forEach((row: any) => {
                    const mapped = mapOrderFromDatabase(row);
                    const isBudget = mapped.orderType === 'budget';
                    if (!mapped.deleted && !isBudget && !uniqueOrders.has(mapped.id!)) {
                        uniqueOrders.set(mapped.id!, mapped);
                    }
                });
            }
        });

        return Array.from(uniqueOrders.values()).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    } catch (error) {
        console.error("Erro ao buscar pedidos por produto:", error);
        return [];
    }
};

/**
 * Busca todos os pedidos de um cliente específico (consultando customer_name e customer_id normalizados)
 */
export const getOrdersByCustomerInfo = async (fullName: string, phone?: string, email?: string): Promise<Order[]> => {
    try {
        let query = supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });

        if (fullName) {
            query = query.ilike('customer_name', `%${fullName.trim()}%`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
            const mapped = data
                .filter((r: any) => !r.deleted)
                .map((row: any) => mapOrderFromDatabase(row));

            const filtered = mapped.filter(o => {
                const matchName = !fullName || o.customerData?.fullName?.toLowerCase() === fullName.toLowerCase();
                const matchPhone = !phone || o.customerData?.phone === phone;
                const matchEmail = !email || o.customerData?.email === email;
                return matchName && matchPhone && matchEmail;
            });

            if (filtered.length > 0) {
                return filtered;
            }
        }

        // Fallback de compatibilidade se busca relacional não retornar resultados
        const queryPromises: any[] = [];
        const baseQuery = () => supabase.from(TABLE_NAME).select('*').order('created_at', { ascending: false });

        if (fullName) {
            queryPromises.push(baseQuery().contains('order_data', { customerData: { fullName } }));
        }
        if (phone && phone.trim() !== '') {
            queryPromises.push(baseQuery().contains('order_data', { customerData: { phone } }));
        }
        if (email && email.trim() !== '') {
            queryPromises.push(baseQuery().contains('order_data', { customerData: { email } }));
        }

        if (queryPromises.length === 0) return [];
        const results = await Promise.all(queryPromises);
        const uniqueOrders = new Map<string, Order>();

        results.forEach(res => {
            if (res.data) {
                res.data.forEach((row: any) => {
                    const mapped = mapOrderFromDatabase(row);
                    if (!mapped.deleted && !uniqueOrders.has(mapped.id!)) {
                        uniqueOrders.set(mapped.id!, mapped);
                    }
                });
            }
        });

        const finalOrders = Array.from(uniqueOrders.values()).filter(o => 
            o.customerData?.fullName?.toLowerCase() === fullName.toLowerCase() ||
            (phone && o.customerData?.phone === phone) ||
            (email && o.customerData?.email === email)
        );

        return finalOrders.sort((a, b) => Number(b.id) - Number(a.id));
    } catch (error) {
        console.error("Erro ao buscar pedidos por cliente:", error);
        return [];
    }
};

/**
 * Busca dados enxutos de pedidos apenas com informações de clientes
 */
export const getOrdersCustomerDataOnly = async (): Promise<{ id: string, date: string, customerData: any, deleted: boolean }[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, created_at, customer_id, customer_name, deleted, order_data');
        
        if (error) throw error;
        
        return (data || []).map((row: any) => {
            const rawLegacy = row.order_data || {};
            const customerData = {
                ...(rawLegacy.customerData || {}),
                id: row.customer_id || rawLegacy.customerData?.id || '',
                fullName: row.customer_name || rawLegacy.customerData?.fullName || ''
            };
            return {
                id: String(row.id),
                date: row.created_at || rawLegacy.date || '',
                customerData,
                deleted: row.deleted != null ? Boolean(row.deleted) : Boolean(rawLegacy.deleted)
            };
        });
    } catch (e) {
        console.error("Erro ao buscar dados enxutos de clientes nos pedidos:", e);
        return [];
    }
};

export const fetchOrderById = async (id: string): Promise<Order | null> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`
                id, order_number, order_index, status, order_type,
                customer_id, customer_name,
                seller_id, seller_name, total_amount, items_subtotal,
                total_discount, total_cost, payment_method, channel, notes,
                scheduled_date, scheduled_start_time, scheduled_end_time,
                delivery_method, delivery_status, delivery_arrived_at,
                delivery_started_at, delivery_finished_at, marketing_origin,
                stock_processed, is_stock_checked, is_registered_in_bling,
                deleted, deleted_at, return_order_id, linked_order_id,
                created_at, updated_at, items, order_data,
                order_items (
                    id, order_id, item_index, product_id, variation_id,
                    code, description, quantity, unit_price, unit_discount,
                    discount_type, cost_price, condition, handling_type,
                    observation, is_temporary_product, item_snapshot
                ),
                order_payments (
                    payment_index, payment_method, amount, fee, fee_type, status, installments, paid_at
                )
            `)
            .eq('id', id)
            .single();
        if (error || !data) return null;
        return mapOrderFromDatabase(data);
    } catch (e) {
        console.error(`[fetchOrderById] Erro ao buscar pedido #${id}:`, e);
        return null;
    }
};
