import Order from "../types/order.type";
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from "./formatters";
import { getOrderIndex } from './orderCode';
import { mapOrderFromDatabase } from './orderMapper';

const TABLE_NAME = "orders";

type OrdersSubscriber = (orders: Order[]) => void;
type OrdersChangeSubscriber = () => void;

// Uma única consulta e um único canal são compartilhados pelos módulos que
// precisam dos pedidos. Antes, cada tela abria sua própria assinatura e fazia
// uma leitura completa de até 300 pedidos para o mesmo evento do Realtime.
const ordersSubscribers = new Set<OrdersSubscriber>();
const orderChangeSubscribers = new Set<OrdersChangeSubscriber>();
let sharedOrdersChannel: ReturnType<typeof supabase.channel> | null = null;
let sharedOrdersSnapshot: Order[] | null = null;
let sharedOrdersRequest: Promise<void> | null = null;
let sharedOrdersRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const orderReadMetrics = {
    executions: 0,
    rows: 0,
    bytes: 0,
    durationMs: 0,
};

const recordOrdersReadMetric = (rows: unknown[], startedAt: number) => {
    const bytes = new TextEncoder().encode(JSON.stringify(rows)).byteLength;
    orderReadMetrics.executions += 1;
    orderReadMetrics.rows += rows.length;
    orderReadMetrics.bytes += bytes;
    orderReadMetrics.durationMs += performance.now() - startedAt;

    if (import.meta.env.DEV && typeof window !== 'undefined') {
        (window as any).__MORANTEHUB_SUPABASE_READ_METRICS__ = {
            ordersSharedSync: { ...orderReadMetrics },
        };
        console.info('[Supabase métricas] ordersSharedSync', {
            executions: orderReadMetrics.executions,
            rows: rows.length,
            responseBytes: bytes,
            durationMs: Math.round(performance.now() - startedAt),
        });
    }
};

export const isValidOrderRow = (row: any) =>
    row?.id != null && (
        (row.order_data && typeof row.order_data === 'object' && !Array.isArray(row.order_data) && Object.keys(row.order_data).length > 0) ||
        (row.order_number != null || row.status != null)
    );

export const enrichOrdersWithPeopleOrigins = async (orders: Order[]): Promise<Order[]> => {
    if (!orders || orders.length === 0) return [];
    
    const customerIds = Array.from(new Set(orders.map(o => o.customerData?.id).filter(Boolean)));
    const peopleOrigins: Record<string, string> = {};
    const peopleById: Record<string, { phone?: string; address?: unknown; full_address?: unknown }> = {};

    if (customerIds.length > 0) {
        try {
            const { data: peopleData } = await supabase
                .from('people')
                .select('id, full_name, marketing_origin, phone, address, full_address')
                .in('id', customerIds);

            if (peopleData) {
                peopleData.forEach((p: any) => {
                    const origin = p.marketing_origin || '';
                    if (p.id) peopleOrigins[String(p.id)] = origin;
                    if (p.full_name) peopleOrigins[String(p.full_name).trim().toLowerCase()] = origin;
                    if (p.id) peopleById[String(p.id)] = p;
                });
            }
        } catch (e) {
            console.error('[OrdersSync] Erro ao buscar origens escopadas de pessoas:', e);
        }
    }

    return orders.map(rawData => {
        const cInfo = rawData.customerData;
        const person = cInfo?.id ? peopleById[String(cInfo.id)] : undefined;
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

        // Pedidos históricos podem ter sido normalizados sem o snapshot de contato.
        // Recompomos somente lacunas a partir do cliente vinculado; dados já congelados
        // no pedido sempre prevalecem para preservar o histórico da venda.
        if (person && cInfo) {
            let personAddress: any = person.address ?? person.full_address;
            if (typeof personAddress === 'string') {
                try {
                    personAddress = JSON.parse(personAddress);
                } catch {
                    personAddress = undefined;
                }
            }

            const hasAddress = (value: any) => Boolean(value && typeof value === 'object' && (
                String(value.street || value.address || '').trim() ||
                String(value.city || '').trim() ||
                String(value.cep || value.zipCode || '').trim()
            ));
            const needsPhone = !cInfo.noPhone && !String(cInfo.phone || '').trim() && String(person.phone || '').trim();
            const needsAddress = !cInfo.noAddress && !hasAddress(cInfo.fullAddress) && hasAddress(personAddress);

            if (needsPhone || needsAddress) {
                rawData.customerData = {
                    ...cInfo,
                    ...(needsPhone ? { phone: String(person.phone).trim() } : {}),
                    ...(needsAddress ? { fullAddress: personAddress } : {}),
                };

                if (rawData.shipping?.useCustomerAddress !== false && needsAddress && !hasAddress(rawData.shipping.deliveryAddress)) {
                    rawData.shipping = { ...rawData.shipping, deliveryAddress: personAddress };
                }
            }
        }
        
        return rawData;
    });
};

export const fetchOrdersPage = async (
    page: number = 1,
    pageSize: number = 15,
    filters?: any
): Promise<{ orders: Order[]; total: number }> => {
    const firstRow = Math.max(0, (page - 1) * pageSize);
    const lastRow = firstRow + pageSize - 1;

    let query = supabase
        .from(TABLE_NAME)
        .select('*, order_items(*), order_payments(*)', { count: 'exact' });

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

export const fetchScheduledAndDraftOrders = async (): Promise<Order[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`
                id, order_number, order_index, status, order_type, customer_id, customer_name,
                seller_id, seller_name, total_amount, payment_method, channel, notes,
                scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method,
                delivery_status, delivery_arrived_at, delivery_started_at, delivery_finished_at,
                marketing_origin, items_subtotal, total_discount, total_cost, stock_processed,
                is_stock_checked, is_registered_in_bling, deleted, deleted_at, return_order_id,
                linked_order_id, returned_total_amount, original_sold_total, return_kind,
                created_at, updated_at,
                order_items(id, order_id, item_index, product_id, variation_id, code, description, quantity, unit_price, unit_discount, cost_price, handling_type, is_temporary_product)
            `)
            .or('deleted.is.null,deleted.eq.false')
            .in('status', ['scheduled', 'draft'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[OrdersSync] Erro ao buscar pedidos agendados:', error);
            return [];
        }

        const rows = Array.isArray(data) ? data : [];
        const mappedOrders = rows.filter(isValidOrderRow).map((row: any) => {
            try {
                return mapOrderFromDatabase(row);
            } catch (_e) {
                return capitalizeOrder({ ...(row.order_data || {}), id: String(row.id) } as Order);
            }
        });

        return await enrichOrdersWithPeopleOrigins(mappedOrders);
    } catch (error) {
        console.error('[OrdersSync] Exception fetching scheduled orders:', error);
        return [];
    }
};

const notifyOrdersSubscribers = () => {
    if (!sharedOrdersSnapshot) return;
    ordersSubscribers.forEach(callback => callback(sharedOrdersSnapshot!));
};

const fetchSharedOrders = async () => {
    if (sharedOrdersRequest || ordersSubscribers.size === 0) return sharedOrdersRequest;

    sharedOrdersRequest = (async () => {
        const startedAt = performance.now();
        try {
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*, order_items(*), order_payments(*)')
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) {
                console.error('[OrdersSync] Fetch error:', error);
                return;
            }

            const rows = Array.isArray(data) ? data : [];
            recordOrdersReadMetric(rows, startedAt);
            const mappedOrders = rows.filter(isValidOrderRow).map((row: any) => {
                try {
                    return mapOrderFromDatabase(row);
                } catch (_e) {
                    return capitalizeOrder({ ...(row.order_data || {}), id: String(row.id) } as Order);
                }
            });

            sharedOrdersSnapshot = await enrichOrdersWithPeopleOrigins(mappedOrders);
            notifyOrdersSubscribers();
        } catch (error) {
            console.error('[OrdersSync] Exception fetching orders:', error);
        } finally {
            sharedOrdersRequest = null;
        }
    })();

    return sharedOrdersRequest;
};

const scheduleSharedOrdersRefresh = () => {
    if (ordersSubscribers.size === 0 || sharedOrdersRefreshTimer) return;
    sharedOrdersRefreshTimer = setTimeout(() => {
        sharedOrdersRefreshTimer = null;
        void fetchSharedOrders();
    }, 3000);
};

const notifyOrderChange = () => {
    orderChangeSubscribers.forEach(callback => callback());
    scheduleSharedOrdersRefresh();
};

const ensureSharedOrdersChannel = () => {
    if (sharedOrdersChannel) return;
    sharedOrdersChannel = supabase.channel('orders_changes_shared')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, notifyOrderChange)
        .subscribe();
};

const releaseSharedOrdersChannelIfUnused = () => {
    if (ordersSubscribers.size > 0 || orderChangeSubscribers.size > 0) return;
    if (sharedOrdersRefreshTimer) {
        clearTimeout(sharedOrdersRefreshTimer);
        sharedOrdersRefreshTimer = null;
    }
    if (sharedOrdersChannel) {
        void supabase.removeChannel(sharedOrdersChannel);
        sharedOrdersChannel = null;
    }
    sharedOrdersSnapshot = null;
};

export const subscribeToOrders = (callback: OrdersSubscriber) => {
    ordersSubscribers.add(callback);
    ensureSharedOrdersChannel();

    if (sharedOrdersSnapshot) {
        callback(sharedOrdersSnapshot);
    } else {
        void fetchSharedOrders();
    }

    return () => {
        ordersSubscribers.delete(callback);
        releaseSharedOrdersChannelIfUnused();
    };
};

export interface DashboardOrdersDateRange {
    start: Date;
    end: Date;
}

const DASHBOARD_ORDERS_COLUMNS = `
    id, order_number, order_index, status, order_type, customer_id, customer_name,
    total_amount, marketing_origin, scheduled_date, delivery_method, delivery_status,
    deleted, deleted_at, created_at, updated_at,
    order_items(id, order_id, product_id, variation_id, description, quantity, unit_price, unit_discount, cost_price, handling_type, is_temporary_product)
`;

/** Fonte C: Busca leve de apenas 5 pedidos recentes para o card da interface */
export const fetchRecentOrders = async (limit: number = 5): Promise<Order[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, order_number, order_index, status, order_type, customer_name, total_amount, created_at')
            .in('status', ['scheduled', 'fulfilled'])
            .or('deleted.is.null,deleted.eq.false')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[OrdersSync] Erro ao buscar pedidos recentes:', error);
            return [];
        }

        return (data || []).map(r => ({
            id: String(r.id),
            orderNumber: r.order_number != null ? Number(r.order_number) : undefined,
            orderIndex: r.order_index != null ? Number(r.order_index) : undefined,
            status: r.status,
            orderType: r.order_type || 'sale',
            customerData: { fullName: r.customer_name || '' } as any,
            totalAmount: Number(r.total_amount || 0),
            date: r.created_at,
            deleted: false
        } as Order));
    } catch (err) {
        console.error('[OrdersSync] Falha em fetchRecentOrders:', err);
        return [];
    }
};

/** Fonte B: Busca leve de até 50 pedidos para radar geográfico (sem order_items pesados) */
export const fetchGeoMapOrders = async (limit: number = 50): Promise<Order[]> => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id, total_amount, status, order_type, customer_name, order_data')
            .in('status', ['scheduled', 'fulfilled'])
            .or('deleted.is.null,deleted.eq.false')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[OrdersSync] Erro ao buscar pedidos do mapa:', error);
            return [];
        }

        return (data || []).map(r => ({
            id: String(r.id),
            totalAmount: Number(r.total_amount || 0),
            status: r.status,
            orderType: r.order_type || 'sale',
            customerData: r.order_data?.customerData || { fullName: r.customer_name || '' },
            shipping: r.order_data?.shipping || {},
            deleted: false
        } as Order));
    } catch (err) {
        console.error('[OrdersSync] Falha em fetchGeoMapOrders:', err);
        return [];
    }
};

/** Fonte A: Leitura otimizada para indicadores e gráficos do dashboard por período */
export const fetchAllOrdersForDashboard = async (range?: DashboardOrdersDateRange): Promise<Order[]> => {
    const pageSize = 1000;
    const rows: any[] = [];
    let from = 0;

    try {
        while (true) {
            let query = supabase
                .from(TABLE_NAME)
                .select(DASHBOARD_ORDERS_COLUMNS)
                .order('created_at', { ascending: false });

            if (range) {
                query = query
                    .gte('created_at', range.start.toISOString())
                    .lte('created_at', range.end.toISOString());
            }

            const { data, error } = await query.range(from, from + pageSize - 1);
            if (error) throw error;
            const page = Array.isArray(data) ? data : [];
            rows.push(...page);
            if (page.length < pageSize) break;
            from += pageSize;
        }

        return rows.filter(isValidOrderRow).map((row: any) => {
            try {
                return mapOrderFromDatabase(row);
            } catch (_e) {
                return capitalizeOrder({ ...(row.order_data || {}), id: String(row.id) } as Order);
            }
        });
    } catch (error) {
        console.error('[OrdersSync] Erro ao buscar dados do dashboard:', error);
        return [];
    }
};

export interface DashboardAggregatesResponse {
    kpis: {
        totalSales: number;
        saleCount: number;
        totalOrdersCount: number;
        totalCmv: number;
        totalProfit: number;
        grossMargin: number;
        avgTicket: number;
        itemsWithoutCost: number;
        cmvPartial: boolean;
        paidTrafficSalesValue: number;
        pendingOrders: number;
        activeSchedules: number;
    };
    chart: Array<{ name: string; valor: number; lucro: number; orders: number }>;
    topProducts: {
        topByQuantity: any[];
        topByRevenue: any[];
        topByProfit: any[];
    };
}

/** Fonte A Server-Side: RPC agregada com payload consolidado < 5 KB */
export const fetchDashboardAggregates = async (
    start: Date,
    end: Date,
    groupBy: 'hour' | 'day' | 'month' = 'month'
): Promise<DashboardAggregatesResponse | null> => {
    try {
        const { data, error } = await supabase.rpc('get_dashboard_aggregates', {
            p_start: start.toISOString(),
            p_end: end.toISOString(),
            p_group_by: groupBy
        });
        if (error) {
            console.warn('[OrdersSync] Falha na RPC agregada, fallback ativado:', error);
            return null;
        }
        return data as DashboardAggregatesResponse;
    } catch (err) {
        console.warn('[OrdersSync] Erro ao invocar RPC agregada:', err);
        return null;
    }
};

// Para telas que já possuem sua própria consulta paginada, o Realtime deve
// apenas sinalizar uma mudança. Isso evita baixar a lista completa sem usar os
// dados recebidos.
export const subscribeToOrderChanges = (callback: OrdersChangeSubscriber) => {
    orderChangeSubscribers.add(callback);
    ensureSharedOrdersChannel();

    return () => {
        orderChangeSubscribers.delete(callback);
        releaseSharedOrdersChannelIfUnused();
    };
};
