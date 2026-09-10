import Order from "../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from "./formatters";
import { splitNoticeTags } from "./noticeTags";

const TABLE_NAME = "orders";

/**
 * Analisa os últimos pedidos para identificar a frequência de uso de avisos (observações)
 */
export const getNoticeFrequency = async (): Promise<Record<string, number>> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('order_data')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        const frequency: Record<string, number> = {};
        
        data?.forEach((row: any) => {
            const observation = row.order_data?.observation;
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
 * SKU e descrição são snapshots comerciais e não participam desta resolução.
 */
export const getOrdersByProductId = async (productId: string, variationId?: string): Promise<Order[]> => {
    try {
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
                    const rawData = { ...(row.order_data || {}), id: String(row.id) } as Order;
                    const isBudget = rawData.orderType === 'budget';
                    if (!rawData.deleted && !isBudget && !uniqueOrders.has(rawData.id!)) {
                        uniqueOrders.set(rawData.id!, capitalizeOrder(rawData));
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
 * Busca todos os pedidos de um cliente específico (sem real-time)
 */
export const getOrdersByCustomerInfo = async (fullName: string, phone?: string, email?: string): Promise<Order[]> => {
    try {
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
                    const rawData = { ...(row.order_data || {}), id: String(row.id) } as Order;
                    if (!rawData.deleted && !uniqueOrders.has(rawData.id!)) {
                        uniqueOrders.set(rawData.id!, capitalizeOrder(rawData));
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
            .select('id, date, order_data->customerData, order_data->deleted');
        
        if (error) throw error;
        
        return (data || []).map((row: any) => ({
            id: String(row.id),
            date: row.date || (row.order_data as any)?.date || '',
            customerData: (row.order_data as any)?.customerData || {},
            deleted: (row.order_data as any)?.deleted === true
        }));
    } catch (e) {
        console.error("Erro ao buscar dados enxutos de clientes nos pedidos:", e);
        return [];
    }
};

export const fetchOrderById = async (id: string): Promise<Order | null> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data) return null;
        return capitalizeOrder({ ...(data.order_data || {}), id: String(data.id) } as Order);
    } catch (e) {
        console.error(`[fetchOrderById] Erro ao buscar pedido #${id}:`, e);
        return null;
    }
};
