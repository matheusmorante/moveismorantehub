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
 * Consulta exclusivamente a tabela normalizada order_items.
 * O JSONB legado só pode ser usado pela migration de resgate, nunca nesta leitura.
 */
export const getOrdersByProductId = async (productId: string, variationId?: string): Promise<Order[]> => {
    try {
        let orderIds: string[] = [];

        // order_items é a única fonte operacional de vínculo entre pedido e produto.
        if (variationId) {
            const { data: itemRows, error } = await supabase
                .from('order_items')
                .select('order_id')
                .eq('variation_id', String(variationId));
            if (error) throw error;
            if (itemRows) {
                orderIds = itemRows.map((r: any) => String(r.order_id));
            }
        } else if (productId) {
            const { data: itemRows, error } = await supabase
                .from('order_items')
                .select('order_id')
                .eq('product_id', String(productId));
            if (error) throw error;
            if (itemRows) {
                orderIds = itemRows.map((r: any) => String(r.order_id));
            }
        }

        if (orderIds.length === 0) return [];

        const uniqueIds = Array.from(new Set(orderIds));
        const { data: ordersData, error } = await supabase
            .from(TABLE_NAME)
            .select(`
                id, order_number, order_index, status, order_type,
                customer_id, customer_name, customer_phone, customer_email,
                seller_id, seller_name, total_amount, items_subtotal,
                total_discount, total_cost, payment_method, channel, notes,
                scheduled_date, scheduled_start_time, scheduled_end_time,
                delivery_method, delivery_status, delivery_arrived_at,
                delivery_started_at, delivery_finished_at, marketing_origin,
                stock_processed, is_stock_checked, is_registered_in_bling,
                deleted, deleted_at, return_order_id, linked_order_id,
                returned_total_amount, original_sold_total, return_kind,
                created_at, updated_at,
                order_items (
                    id, order_id, item_index, product_id, variation_id,
                    code, description, quantity, unit_price, unit_discount,
                    discount_type, cost_price, condition, handling_type,
                    observation, is_temporary_product, item_snapshot
                ),
                order_payments (
                    payment_index, payment_method, amount, fee, fee_type,
                    status, installments, paid_at
                )
            `)
            .in('id', uniqueIds)
            .eq('deleted', false)
            .neq('order_type', 'budget')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return ordersData?.map((row: any) => mapOrderFromDatabase(row)) || [];
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
        // Sem um nome normalizado, a consulta anterior buscava todos os pedidos
        // para filtrar telefone/e-mail no navegador. Nesses casos, use apenas
        // os filtros legados abaixo, que são executados no banco.
        if (fullName.trim()) {
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .ilike('customer_name', `%${fullName.trim()}%`)
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                const filtered = data
                    .filter((r: any) => !r.deleted)
                    .map((row: any) => mapOrderFromDatabase(row))
                    .filter(o => {
                        const matchName = o.customerData?.fullName?.toLowerCase() === fullName.toLowerCase();
                        const matchPhone = !phone || o.customerData?.phone === phone;
                        const matchEmail = !email || o.customerData?.email === email;
                        return matchName && matchPhone && matchEmail;
                    });

                if (filtered.length > 0) return filtered;
            }
        }

        // Fallback de compatibilidade se busca relacional não retornar resultados
        const queryPromises: any[] = [];
        const baseQuery = () => supabase.from(TABLE_NAME).select('id, created_at, order_data, status, deleted').order('created_at', { ascending: false }).limit(30);

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
        const { data: normalizedRows, error } = await supabase
            .from(TABLE_NAME)
            .select('id, created_at, customer_id, customer_name, deleted');
        
        if (error) throw error;

        // Mantém a compatibilidade com pedidos realmente legados, sem baixar
        // snapshots de todos os pedidos que já possuem cliente normalizado.
        const { data: legacyRows, error: legacyError } = await supabase
            .from(TABLE_NAME)
            .select('id, created_at, customer_id, customer_name, deleted, order_data')
            .is('customer_name', null);

        if (legacyError) throw legacyError;

        const rows = [
            ...(normalizedRows || []).filter((row: any) => row.customer_name != null),
            ...(legacyRows || []),
        ];
        
        return rows.map((row: any) => {
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
