import { excludeTestOrders } from '../../../../../shared-utils/testArtifactQueries';
import Order from '../../types/order.type';
import type { GeoMapOrderProjection, RecentOrderProjection } from '../../types/dashboardOrderProjection.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from '../formatters';
import { mapOrderFromDatabase } from '../orderMapper';
import { isHmlFiscalTestOrder } from '../hmlTestData';
import {
  TABLE_NAME,
  DASHBOARD_ORDERS_COLUMNS,
  RECENT_DASHBOARD_ORDERS_COLUMNS,
} from './orderSyncConstants';
import {
  DashboardOrdersDateRange,
  DashboardAggregatesResponse,
} from './orderSyncTypes';
import { isValidOrderRow } from './orderPeopleEnrichment';

/** Fonte C: Busca leve de apenas 5 pedidos recentes para o card da interface */
export const fetchRecentOrders = async (limit: number = 5): Promise<RecentOrderProjection[]> => {
  try {
    const { data, error } = await excludeTestOrders(supabase
      .from(TABLE_NAME)
      .select(RECENT_DASHBOARD_ORDERS_COLUMNS))
      .in('status', ['scheduled', 'fulfilled'])
      .or('deleted.is.null,deleted.eq.false')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[OrdersSync] Erro ao buscar pedidos recentes:', error);
      return [];
    }

    return (data || []).filter((row) => !isHmlFiscalTestOrder(row)).map(
      (r) =>
        ({
          id: String(r.id),
          orderNumber: r.order_number != null ? Number(r.order_number) : undefined,
          orderIndex: r.order_index != null ? Number(r.order_index) : undefined,
          status: r.status,
          orderType: r.order_type || 'sale',
          customerData: { fullName: r.customer_name || '' } as any,
          totalAmount: Number(r.total_amount || 0),
          date: r.created_at,
          deleted: false,
        })
    );
  } catch (err) {
    console.error('[OrdersSync] Falha em fetchRecentOrders:', err);
    return [];
  }
};

/** Fonte B: Busca leve de até 50 pedidos para radar geográfico (sem order_items pesados) */
export const fetchGeoMapOrders = async (limit: number = 50): Promise<GeoMapOrderProjection[]> => {
  try {
    const { data, error } = await excludeTestOrders(supabase
      .from(TABLE_NAME)
      .select('id, total_amount, status, order_type, customer_name, order_data'))
      .in('status', ['scheduled', 'fulfilled'])
      .or('deleted.is.null,deleted.eq.false')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[OrdersSync] Erro ao buscar pedidos do mapa:', error);
      return [];
    }

    return (data || []).filter((row) => !isHmlFiscalTestOrder(row.order_data)).map(
      (r) =>
        ({
          id: String(r.id),
          totalAmount: Number(r.total_amount || 0),
          status: r.status,
          orderType: r.order_type || 'sale',
          customerData: r.order_data?.customerData || { fullName: r.customer_name || '' },
          shipping: r.order_data?.shipping || {},
          itemsSummary: {
            itemsTotalValue: Number(
              r.order_data?.itemsSummary?.itemsTotalValue ?? r.total_amount ?? 0
            ),
          },
          deleted: false,
        })
    );
  } catch (err) {
    console.error('[OrdersSync] Falha em fetchGeoMapOrders:', err);
    return [];
  }
};

/** Fonte A: Leitura otimizada para indicadores e gráficos do dashboard por período */
export const fetchAllOrdersForDashboard = async (
  range?: DashboardOrdersDateRange
): Promise<Order[]> => {
  const pageSize = 1000;
  const rows: any[] = [];
  let from = 0;

  try {
    while (true) {
      let query = excludeTestOrders(supabase
        .from(TABLE_NAME)
        .select(DASHBOARD_ORDERS_COLUMNS))
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

    return rows
      .filter(isValidOrderRow)
      .filter((row: any) => !isHmlFiscalTestOrder(row))
      .map((row: any) => {
        try {
          return mapOrderFromDatabase(row);
        } catch {
          return capitalizeOrder({ ...(row.order_data || {}), id: String(row.id) } as Order);
        }
      });
  } catch (error) {
    console.error('[OrdersSync] Erro ao buscar dados do dashboard:', error);
    return [];
  }
};

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
      p_group_by: groupBy,
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
