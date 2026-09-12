import Order from "../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from "./formatters";
import { getOrderIndex } from './orderCode';
import { mapOrderFromDatabase } from './orderMapper';

const TABLE_NAME = "orders";

export const isValidOrderRow = (row: any) =>
    row?.id != null && (
        (row.order_data && typeof row.order_data === 'object' && !Array.isArray(row.order_data) && Object.keys(row.order_data).length > 0) ||
        (row.order_number != null || row.status != null)
    );

export const enrichOrdersWithPeopleOrigins = async (orders: Order[]): Promise<Order[]> => {
    if (!orders || orders.length === 0) return [];
    
    const customerIds = Array.from(new Set(orders.map(o => o.customerData?.id).filter(Boolean)));
    let peopleOrigins: Record<string, string> = {};

    if (customerIds.length > 0) {
        try {
            const { data: peopleData } = await supabase
                .from('people')
                .select('id, full_name, marketing_origin')
                .in('id', customerIds);

            if (peopleData) {
                peopleData.forEach((p: any) => {
                    const origin = p.marketing_origin || '';
                    if (p.id) peopleOrigins[String(p.id)] = origin;
                    if (p.full_name) peopleOrigins[String(p.full_name).trim().toLowerCase()] = origin;
                });
            }
        } catch (e) {
            console.error('[OrdersSync] Erro ao buscar origens escopadas de pessoas:', e);
        }
    }

    return orders.map(rawData => {
        const cInfo = rawData.customerData;
        let legacyMarketingOrig: string | undefined = undefined;
        if (cInfo?.id && peopleOrigins[String(cInfo.id)]) {
            legacyMarketingOrig = peopleOrigins[String(cInfo.id)];
        } else if (cInfo?.fullName && peopleOrigins[String(cInfo.fullName).trim().toLowerCase()]) {
            legacyMarketingOrig = peopleOrigins[String(cInfo.fullName).trim().toLowerCase()];
        }
        
        if (legacyMarketingOrig === 'paid') {
            rawData.marketingOrigin = 'paid';
        } else if (legacyMarketingOrig && (!rawData.marketingOrigin || rawData.marketingOrigin === 'organic' || rawData.marketingOrigin === 'Direto na Loja')) {
            rawData.marketingOrigin = legacyMarketingOrig;
        }
        
        if (rawData.marketingOrigin === 'Direto na Loja') rawData.marketingOrigin = 'organic';
        if (rawData.marketingOrigin === 'Tráfego Pago') rawData.marketingOrigin = 'paid';
        
        return rawData;
    });
};

export const fetchOrdersPage = async (
    page: number = 1,
    pageSize: number = 30,
    filters?: any
): Promise<{ orders: Order[]; total: number }> => {
    const firstRow = Math.max(0, (page - 1) * pageSize);
    const lastRow = firstRow + pageSize - 1;

    let query = supabase
        .from(TABLE_NAME)
        .select('id, order_number, status, order_type, customer_name, total_amount, created_at, updated_at, order_data', { count: 'exact' });

    const showTrash = filters?.showTrash || false;
    const isDraft = filters?.isDraft || false;

    if (showTrash) {
        query = query.eq('deleted', true);
    } else {
        query = query.or('deleted.is.null,deleted.eq.false');
        if (isDraft) {
            query = query.eq('status', 'draft');
        }
    }

    if (filters?.searchId) {
        query = query.eq('id', filters.searchId);
    }

    if (filters?.isBudgetView) {
        query = query.eq('order_type', 'budget');
    } else if (filters?.isAssistanceView) {
        query = query.eq('order_type', 'assistance');
    } else if (filters?.isReturnView) {
        query = query.eq('order_type', 'return');
    } else if (filters?.orderType) {
        query = query.eq('order_type', filters.orderType);
    } else {
        query = query.not('order_type', 'in', '(budget,assistance,return)');
    }

    const customerName = String(filters?.customerName || '').trim();
    if (customerName) {
        query = query.ilike('customer_name', `%${customerName}%`);
    }

    query = query.order('created_at', { ascending: false }).range(firstRow, lastRow);

    const { data, count, error } = await query;
    if (error) {
        console.error('[OrdersService] Erro ao buscar página de pedidos:', error);
        return { orders: [], total: 0 };
    }

    const rawOrders = (data || [])
        .filter(isValidOrderRow)
        .map(mapOrderFromDatabase);

    const returnOrderIds = rawOrders
        .filter((order) => order.orderType !== 'return')
        .map((order) => order.returnOrderId)
        .filter((id): id is string => Boolean(id));

    if (returnOrderIds.length > 0) {
        const { data: returnRows, error: returnError } = await supabase
            .from(TABLE_NAME)
            .select('id, order_data')
            .in('id', returnOrderIds);

        if (returnError) {
            console.warn('[OrdersService] Não foi possível carregar o estado das devoluções vinculadas:', returnError);
        } else {
            const returnMovementById = new Map((returnRows || []).map((row: any) => [
                String(row.id),
                {
                    status: row.order_data?.status,
                    stockProcessed: Boolean(row.order_data?.returnStockProcessed),
                    stockReversed: Boolean(row.order_data?.returnStockReversed),
                    items: row.order_data?.items || [],
                    movedProductIds: row.order_data?.movedProductIds || [],
                },
            ]));

            rawOrders.forEach((order) => {
                if (order.returnOrderId) {
                    order.linkedReturnMovement = returnMovementById.get(order.returnOrderId);
                }
            });
        }
    }

    const enrichedOrders = await enrichOrdersWithPeopleOrigins(rawOrders);
    return { orders: enrichedOrders, total: count || 0 };
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
    let aborted = false;
    let currentOrders: Order[] = [];

    const fetchAndCallback = async () => {
        if (aborted) return;
        try {
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('id, order_number, status, order_type, customer_name, total_amount, created_at, updated_at, order_data')
                .order('created_at', { ascending: false })
                .limit(300);

            if (aborted) return;

            if (error) {
                console.error('[OrdersSync] Fetch error:', error);
                callback([]);
                return;
            }

            if (data && Array.isArray(data)) {
                const mappedOrders = data.filter(isValidOrderRow).map((row: any) => {
                    try {
                        return mapOrderFromDatabase(row);
                    } catch (_e) {
                        const raw = { ...(row.order_data || {}), id: String(row.id) } as Order;
                        return capitalizeOrder(raw);
                    }
                });

                const enriched = await enrichOrdersWithPeopleOrigins(mappedOrders);
                currentOrders = enriched;
                callback(currentOrders);
            }
        } catch (e) {
            console.error('[OrdersSync] Exception fetching orders:', e);
        }
    };

    fetchAndCallback();

    const channel = supabase.channel(`orders_changes_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, (payload: any) => {
            if (aborted) return;
            
            if (payload.eventType === 'INSERT') {
                const newRow = payload.new;
                if (!isValidOrderRow(newRow)) return;
                try {
                    const formatted = mapOrderFromDatabase(newRow);
                    currentOrders = [formatted, ...currentOrders];
                    callback(currentOrders);
                } catch (e) {
                    console.error('[OrdersSync] Error parsing inserted order, refetching...', e);
                    fetchAndCallback();
                }
            } else if (payload.eventType === 'UPDATE') {
                const updatedRow = payload.new;
                if (!isValidOrderRow(updatedRow)) {
                    currentOrders = currentOrders.filter(o => o.id !== String(updatedRow.id));
                    callback(currentOrders);
                    return;
                }
                try {
                    const formatted = mapOrderFromDatabase(updatedRow);
                    currentOrders = currentOrders.map(o => o.id === formatted.id ? formatted : o);
                    callback(currentOrders);
                } catch (e) {
                    console.error('[OrdersSync] Error parsing updated order, refetching...', e);
                    fetchAndCallback();
                }
            } else if (payload.eventType === 'DELETE') {
                const deletedId = String(payload.old.id);
                currentOrders = currentOrders.filter(o => o.id !== deletedId);
                callback(currentOrders);
            }
        })
        .subscribe();

    return () => {
        aborted = true;
        supabase.removeChannel(channel);
    };
};
