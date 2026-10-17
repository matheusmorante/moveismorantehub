import { excludeTestOrders } from '../../../../../shared-utils/testArtifactQueries';
import Order from '../../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { mapOrderFromDatabase } from '../orderMapper';
import { TABLE_NAME, ORDER_LIST_COLUMNS } from './orderSyncConstants';
import { FetchFulfilledOrdersOptions } from './orderSyncTypes';
import { isValidOrderRow, enrichOrdersWithPeopleOrigins } from './orderPeopleEnrichment';

export const fetchOrdersPage = async (
  page: number = 1,
  pageSize: number = 15,
  filters?: any,
  options: { throwOnError?: boolean } = {}
): Promise<{ orders: Order[]; total: number }> => {
  const firstRow = Math.max(0, (page - 1) * pageSize);
  const lastRow = firstRow + pageSize - 1;

  let query = supabase
    .from(TABLE_NAME)
    .select(ORDER_LIST_COLUMNS, { count: 'exact' });

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

  if (!filters?.showTestOrders) {
    query = excludeTestOrders(query);
  }

  if (Array.isArray(filters?.statuses) && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses);
  } else if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.valueRange) {
    const minimumValue = Number(filters.valueRange.min);
    const maximumValue = Number(filters.valueRange.max);
    if (Number.isFinite(minimumValue)) query = query.gte('total_amount', minimumValue);
    if (Number.isFinite(maximumValue)) query = query.lte('total_amount', maximumValue);
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

  query = query
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(firstRow, lastRow);

  const { data, count, error } = await query;
  if (error) {
    console.error('[OrdersService] Erro ao buscar página de pedidos:', error);
    if (options.throwOnError) throw error;
    return { orders: [], total: 0 };
  }

  const rawOrders = (data || []).filter(isValidOrderRow).map(mapOrderFromDatabase);

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
      console.warn(
        '[OrdersService] Não foi possível carregar o estado das devoluções vinculadas:',
        returnError
      );
    } else {
      const returnMovementById = new Map(
        (returnRows || []).map((row: any) => [
          String(row.id),
          {
            status: row.order_data?.status,
            stockProcessed: Boolean(row.order_data?.returnStockProcessed),
            stockReversed: Boolean(row.order_data?.returnStockReversed),
            items: row.order_data?.items || [],
            movedProductIds: row.order_data?.movedProductIds || [],
          },
        ])
      );

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

/**
 * Busca página de pedidos de venda estritamente atendidos (fulfilled/atendido/delivered/entregue/retirado).
 * Usado pelo modal de seleção de pedido original para ordens de assistência.
 */
export const fetchFulfilledSalesOrdersPage = async (
  options: FetchFulfilledOrdersOptions = {}
): Promise<{ orders: Order[]; total: number }> => {
  const page = options.page || 1;
  const pageSize = options.pageSize || 15;
  const firstRow = Math.max(0, (page - 1) * pageSize);
  const lastRow = firstRow + pageSize - 1;

  let query = supabase
    .from(TABLE_NAME)
    .select(ORDER_LIST_COLUMNS, { count: 'exact' });

  // 1. Apenas pedidos ativos (não deletados)
  query = query.or('deleted.is.null,deleted.eq.false');

  // 2. Exclui pedidos de teste
  query = excludeTestOrders(query);

  // 3. Apenas pedidos de venda (não orçamentos, assistências ou devoluções)
  query = query.not('order_type', 'in', '(budget,assistance,return)');

  // 4. Apenas pedidos atendidos
  query = query.in('status', ['fulfilled', 'atendido', 'delivered', 'entregue', 'retirado']);

  // 5. Termo de busca (código, número ou nome do cliente)
  const cleanTerm = String(options.searchTerm || '').replace(/^#/, '').trim();
  if (cleanTerm) {
    const sanitized = cleanTerm.replace(/[,()]/g, '');
    if (sanitized) {
      const isNumeric = /^\d+$/.test(sanitized);
      if (isNumeric) {
        const num = parseInt(sanitized, 10);
        query = query.or(
          `customer_name.ilike.%${sanitized}%,id.ilike.%${sanitized}%,order_number.ilike.%${sanitized}%,order_index.eq.${num}`
        );
      } else {
        query = query.or(`customer_name.ilike.%${sanitized}%,id.ilike.%${sanitized}%`);
      }
    }
  }

  // 6. Ordenação
  const sortAsc = options.sortOrder === 'asc';
  if (options.sortBy === 'id') {
    query = query.order('id', { ascending: sortAsc });
  } else if (options.sortBy === 'customer') {
    query = query.order('customer_name', { ascending: sortAsc, nullsFirst: false });
  } else {
    // Padrão: data de criação mais recente
    query = query.order('created_at', { ascending: sortAsc });
  }

  // Desempate determinístico
  query = query.order('id', { ascending: true });

  // 7. Paginação: 15 itens por página
  query = query.range(firstRow, lastRow);

  const { data, count, error } = await query;
  if (error) {
    console.error('[OrdersService] Erro ao buscar pedidos atendidos paginados:', error);
    return { orders: [], total: 0 };
  }

  const rawOrders = (data || []).filter(isValidOrderRow).map(mapOrderFromDatabase);
  const enrichedOrders = await enrichOrdersWithPeopleOrigins(rawOrders);
  return { orders: enrichedOrders, total: count || 0 };
};

/** Loads the complete server-filtered candidate set before client-only list filters run. */
export const fetchOrdersForClientFiltering = async (
  filters?: any,
  options: { throwOnError?: boolean } = {}
): Promise<Order[]> => {
  const pageSize = 1000;
  const serverFilters = filters?.customerName
    ? { ...filters, customerName: undefined }
    : filters;
  const allOrders: Order[] = [];
  let total: number;
  let page = 1;

  do {
    const result = await fetchOrdersPage(page, pageSize, serverFilters, options);
    total = result.total;
    allOrders.push(...result.orders);
    if (result.orders.length === 0) break;
    page += 1;
  } while (allOrders.length < total);

  return allOrders;
};
