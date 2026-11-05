import Order from '../types/order.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { capitalizeOrder } from './formatters';
import { splitNoticeTags } from './noticeTags';
import { mapOrderFromDatabase } from './orderMapper';
import { excludeTestOrders } from '../../../../shared-utils/testArtifactQueries';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';
import { fetchServerOrderPage } from '../../../../shared-utils/orderListServerQuery';
import { fetchOrdersPage } from './orderSyncQueries/orderListQueries';

const TABLE_NAME = 'orders';

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
    console.error('Erro ao carregar frequência de avisos:', error);
    return {};
  }
};

/**
 * Busca todos os pedidos que contenham um determinado produto/variação.
 * Consulta exclusivamente a tabela normalizada order_items.
 * O JSONB legado só pode ser usado pela migration de resgate, nunca nesta leitura.
 */
export const getOrdersByProductId = async (
  productId: string,
  variationId?: string,
  signal?: AbortSignal,
): Promise<Order[]> => {
  let orderIds: string[] = [];

  // order_items é a única fonte operacional de vínculo entre pedido e produto.
  if (variationId) {
    const { data: itemRows, error } = await withAbortTimeout(
      supabase
        .from('order_items')
        .select('order_id')
        .eq('variation_id', String(variationId)),
      'produtos:pedidos-vinculados-itens-variacao',
      15_000,
      signal,
    );
    if (error) throw error;
    if (itemRows) {
      orderIds = itemRows.map((r: any) => String(r.order_id));
    }
  } else if (productId) {
    const { data: itemRows, error } = await withAbortTimeout(
      supabase
        .from('order_items')
        .select('order_id')
        .eq('product_id', String(productId)),
      'produtos:pedidos-vinculados-produto',
      15_000,
      signal,
    );
    if (error) throw error;
    if (itemRows) {
      orderIds = itemRows.map((r: any) => String(r.order_id));
    }
  }

  if (orderIds.length === 0) return [];

  const uniqueIds = Array.from(new Set(orderIds));
  const ordersQuery = excludeTestOrders(
    supabase
      .from(TABLE_NAME)
      .select(`
                id, order_number, order_index, status, order_type,
                customer_id, customer_name,
                seller_id, seller_name, total_amount, items_subtotal,
                total_discount, total_cost, payment_method, channel, notes,
                scheduled_date, scheduled_start_time, scheduled_end_time,
                delivery_method, delivery_status, delivery_arrived_at,
                delivery_started_at, delivery_finished_at, marketing_origin,
                stock_processed, is_stock_checked,
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
      .order('created_at', { ascending: false })
  );

  const { data: ordersData, error } = await withAbortTimeout(
    ordersQuery,
    'produtos:pedidos-vinculados-detalhes',
    15_000,
    signal,
  );

  if (error) throw error;
  return ordersData?.map((row: any) => mapOrderFromDatabase(row)) || [];
};

/** Consulta o histórico de um cliente com critérios e totais calculados no servidor. */
export const getOrdersByCustomerInfoPage = async (
  fullName: string,
  phone?: string,
  email?: string,
  options: { page?: number; pageSize?: number; signal?: AbortSignal; partialName?: boolean } = {},
): Promise<{ orders: Order[]; total: number; totalAmount: number }> => {
  const name = String(fullName || '').trim();
  const customerPhone = String(phone || '').trim();
  const customerEmail = String(email || '').trim();
  if (!name && !customerPhone && !customerEmail) {
    return { orders: [], total: 0, totalAmount: 0 };
  }

  const common = {
    includeAllTypes: true,
    showTestOrders: true,
    multiSort: [{ key: 'createdAt', order: 'desc' }],
  };
  const page = options.page || 1;
  const pageSize = options.pageSize || 15;
  const requestOptions = { throwOnError: true, signal: options.signal };
  if (options.partialName) {
    return fetchOrdersPage(page, pageSize, { ...common, customerName: name }, requestOptions);
  }

  const contact = { customerExactName: name, customerPhone, customerEmail };
  if (name) {
    const strict = await fetchOrdersPage(page, pageSize, {
      ...common, ...contact, customerContactMode: 'strict',
    }, requestOptions);
    if (strict.total > 0) return strict;
  }
  return fetchOrdersPage(page, pageSize, {
    ...common, ...contact, customerContactMode: 'any',
  }, requestOptions);
};

/** Fachada legada: mantém a leitura dos primeiros registros do cliente. */
export const getOrdersByCustomerInfo = async (
  fullName: string,
  phone?: string,
  email?: string,
): Promise<Order[]> => {
  try {
    return (await getOrdersByCustomerInfoPage(fullName, phone, email)).orders;
  } catch (error) {
    console.error('Erro ao buscar pedidos por cliente:', error);
    return [];
  }
};

/**
 * Busca dados enxutos de pedidos apenas com informações de clientes
 */
export const getOrdersCustomerDataOnly = async (options?: {
  limit?: number;
  searchTerm?: string;
}): Promise<{ id: string; date: string; customerData: any; deleted: boolean }[]> => {
  try {
    const selected = await fetchServerOrderPage(supabase, {
      filters: { includeAllTypes: true, customerName: options?.searchTerm || '', multiSort: [{ key: 'createdAt', order: 'desc' }] },
      page: 1, pageSize: Math.min(options?.limit || 15, 15), mode: 'erp',
    });
    if (!selected.ids.length) return [];
    const { data, error } = await withAbortTimeout(supabase.from(TABLE_NAME)
      .select('id,created_at,customer_id,customer_name,deleted,legacy_customer:order_data->customerData')
      .in('id', selected.ids), 'pedidos:clientes-do-resultado', 15_000);
    if (error) throw error;
    const byId = new Map((data || []).map((row: any) => [String(row.id), row]));
    return selected.ids.flatMap((id) => {
      const row: any = byId.get(id);
      return row ? [{ id, date: row.created_at || '', deleted: Boolean(row.deleted),
        customerData: { ...row.legacy_customer, id: row.customer_id || row.legacy_customer?.id || '',
          fullName: row.customer_name || row.legacy_customer?.fullName || '' } }] : [];
    });
  } catch (e) {
    console.error('Erro ao buscar dados enxutos de clientes nos pedidos:', e);
    return [];
  }
};

export const fetchOrderById = async (id: string): Promise<Order | null> => {
  try {
    const { data, error } = await withAbortTimeout(supabase
      .from(TABLE_NAME)
      .select(`
                id, order_number, order_index, status, order_type,
                customer_id, customer_name,
                seller_id, seller_name, total_amount, items_subtotal,
                total_discount, total_cost, payment_method, channel, notes,
                scheduled_date, scheduled_start_time, scheduled_end_time,
                delivery_method, delivery_status, delivery_arrived_at,
                delivery_started_at, delivery_finished_at, marketing_origin,
                stock_processed, is_stock_checked,
                deleted, deleted_at, return_order_id, linked_order_id,
                returned_total_amount, original_sold_total, return_kind, version,
                created_at, updated_at, items, order_data,
                order_items (
                    id, order_id, item_index, product_id, variation_id,
                    code, description, quantity, unit_price, unit_discount,
                    discount_type, cost_price, condition, handling_type,
                    observation, is_temporary_product, item_snapshot,
                    returned_quantity, returned_unit_price, returned_total_value, original_unit_price, original_total_value
                ),
                order_payments (
                    payment_index, payment_method, amount, fee, fee_type, status, installments, paid_at
                )
            `)
      .eq('id', id)
      .single(), 'pedidos:detalhe-completo', 15_000);
    if (error || !data) return null;
    return mapOrderFromDatabase(data);
  } catch (e) {
    console.error(`[fetchOrderById] Erro ao buscar pedido #${id}:`, e);
    return null;
  }
};
