import type { SupabaseClient } from '@supabase/supabase-js';
import { withTimeout } from '../../../../../../shared-utils/withTimeout.js';
import { supportCustomerRecordFiltersSchema } from '../../../../../../shared-utils/customerSupportFormSchemas.js';
import {
  type SupportOrderSummary,
  type SupportCustomerOrderGroup,
  type SupportCustomerOrderPage,
  SUPPORT_ORDERS_LOAD_ERROR,
  SUPPORT_ORDERS_PERMISSION_ERROR,
} from './ordersTypes.js';
import {
  mapOrderToSupportSummary,
  mapOrderToSupportRecordSummary,
} from './ordersMappers.js';

/**
 * Consulta pedidos de venda vinculados a um cliente no ERP.
 * Filtra no servidor e retorna até 15 documentos recentes.
 */
export async function getCustomerOrders(
  supabase: SupabaseClient,
  customerId: string,
  orderFilter: 'all' | 'orders' | 'quotes' = 'all'
): Promise<SupportOrderSummary[]> {
  if (!customerId) return [];

  let response;
  try {
    response = await withTimeout<any>(
      supabase.rpc('customer_support_list_customer_orders_filtered', {
        p_customer_id: customerId,
        p_order_filter: orderFilter,
      }),
      15_000,
      null,
      'central:pedidos-cliente'
    );
  } catch {
    throw new Error(SUPPORT_ORDERS_LOAD_ERROR);
  }
  if (response?.error?.code === '42501') {
    throw new Error(SUPPORT_ORDERS_PERMISSION_ERROR);
  }
  if (response?.error || !Array.isArray(response?.data)) {
    throw new Error(SUPPORT_ORDERS_LOAD_ERROR);
  }

  return response.data.map(mapOrderToSupportSummary);
}

/** Consult all customer commercial records using permission-checked server paging. */
export async function getCustomerOrderRecordsPage(
  supabase: SupabaseClient,
  contactPhone: string,
  orderGroup: SupportCustomerOrderGroup,
  options: { page?: number; pageSize?: number; search?: string; status?: string } = {}
): Promise<SupportCustomerOrderPage> {
  if (!contactPhone) return { records: [], page: 1, pageSize: 20, total: 0 };
  const filters = supportCustomerRecordFiltersSchema.safeParse({
    search: options.search || '',
    status: options.status || '',
  });
  if (!filters.success) throw new Error(filters.error.issues[0]?.message || 'Filtro inválido.');

  const page = Math.max(1, Math.trunc(options.page || 1));
  const pageSize = Math.min(50, Math.max(1, Math.trunc(options.pageSize || 20)));
  let response;
  try {
    response = await withTimeout<any>(
      supabase.rpc('customer_support_list_customer_records_page', {
        // The SQL RPC keeps this legacy argument name; it now receives the conversation phone.
        p_customer_id: contactPhone,
        p_order_group: orderGroup,
        p_page: page,
        p_page_size: pageSize,
        p_status: filters.data.status || null,
        p_search: filters.data.search || null,
      }),
      15_000,
      null,
      'central:historico-comercial-cliente'
    );
  } catch {
    throw new Error(SUPPORT_ORDERS_LOAD_ERROR);
  }
  if (response?.error?.code === '42501') throw new Error(SUPPORT_ORDERS_PERMISSION_ERROR);
  if (response?.error || !response?.data || !Array.isArray(response.data.records)) {
    throw new Error(SUPPORT_ORDERS_LOAD_ERROR);
  }

  return {
    records: response.data.records.map(mapOrderToSupportRecordSummary),
    page: Number(response.data.page) || page,
    pageSize: Number(response.data.page_size) || pageSize,
    total: Math.max(0, Number(response.data.total) || 0),
  };
}
