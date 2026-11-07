import Order from '../../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { mapOrderFromDatabase } from '../orderMapper';
import { FetchFulfilledOrdersOptions } from './orderSyncTypes';
import { isValidOrderRow, enrichOrdersWithPeopleOrigins } from './orderPeopleEnrichment';
import { enrichLinkedReturnMovements } from './orderReturnMovementSummary';
import { enrichAssistanceLinkedOrders } from './assistanceLinkedOrderEnricher';
import { fetchServerOrderPage } from '../../../../../shared-utils/orderListServerQuery';
import { fetchOrderSummaries } from '../../../../../shared-utils/orderSummaryQuery';

export const fetchOrdersPage = async (
  page: number = 1,
  pageSize: number = 15,
  filters?: any,
  options: {
    throwOnError?: boolean;
    signal?: AbortSignal;
    skipLinkedReturnMovementEnrichment?: boolean;
    skipPeopleOriginEnrichment?: boolean;
  } = {}
): Promise<{ orders: Order[]; total: number; totalAmount: number }> => {
  try {
    const selected = await fetchServerOrderPage(supabase, {
      filters: filters || {}, page, pageSize, mode: 'erp', signal: options.signal,
    });
    if (selected.ids.length === 0) return { orders: [], total: selected.total, totalAmount: selected.totalAmount };

    const data = await fetchOrderSummaries(supabase, selected.ids, options.signal);
    const rows = Array.isArray(data) ? data : [];
    if (rows.some((row) => !isValidOrderRow(row))) {
      throw new Error('Um pedido da página não possui dados válidos.');
    }
    const byId = new Map(rows.map((row) => [String(row.id), row]));
    const rawOrders = selected.ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [mapOrderFromDatabase(row)] : [];
    });
    if (!options.skipLinkedReturnMovementEnrichment) {
      await enrichLinkedReturnMovements(rawOrders);
    }
    await enrichAssistanceLinkedOrders(rawOrders);
    const orders = options.skipPeopleOriginEnrichment
      ? rawOrders
      : await enrichOrdersWithPeopleOrigins(rawOrders);
    return { orders, total: selected.total, totalAmount: selected.totalAmount };
  } catch (error) {
    if (options.throwOnError) throw error;
    console.error('[OrdersService] Erro ao buscar página de pedidos:', error);
    return { orders: [], total: 0, totalAmount: 0 };
  }
};

/**
 * Busca página de pedidos de venda estritamente atendidos (fulfilled/atendido/delivered/entregue/retirado).
 * Usado pelo modal de seleção de pedido original para ordens de assistência.
 */
export const fetchFulfilledSalesOrdersPage = async (
  options: FetchFulfilledOrdersOptions = {}
): Promise<{ orders: Order[]; total: number }> => {
  return fetchOrdersPage(options.page || 1, options.pageSize || 15, {
    statuses: ['fulfilled', 'atendido', 'delivered', 'entregue', 'retirado'],
    generalSearch: String(options.searchTerm || '').replace(/^#/, '').trim(),
    multiSort: [{ key: options.sortBy && options.sortBy !== 'date' ? options.sortBy : 'createdAt', order: options.sortOrder || 'desc' }],
  });
};
