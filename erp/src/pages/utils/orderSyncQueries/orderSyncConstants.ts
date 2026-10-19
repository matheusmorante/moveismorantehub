export const TABLE_NAME = 'orders';

// Select mapper fields present in the current orders schema and only the child
// fields it consumes, while retaining JSON snapshots for legacy orders.
export const ORDER_LIST_COLUMNS = `
  id, order_number, order_index, status, order_type, customer_id, customer_name,
  seller_id, seller_name, total_amount, payment_method, channel, notes,
  scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method,
  delivery_status, delivery_arrived_at, delivery_started_at, delivery_finished_at,
  marketing_origin, items_subtotal, total_discount, total_cost, stock_processed,
  is_stock_checked, is_registered_in_bling, deleted, deleted_at, return_order_id,
  linked_order_id, returned_total_amount, original_sold_total, return_kind,
  created_at, updated_at, items, order_data,
  order_items(
    id, item_index, product_id, variation_id, code, description, quantity, unit_price,
    unit_discount, discount_type, cost_price, condition, handling_type,
    observation, is_temporary_product, item_snapshot, returned_quantity,
    returned_unit_price, returned_total_value, original_unit_price, original_total_value
  ),
  order_payments(payment_method, amount, fee, fee_type, status, installments)
`;

export const DASHBOARD_ORDERS_COLUMNS = `
    id, order_number, order_index, status, order_type, customer_id, customer_name,
    total_amount, marketing_origin, scheduled_date, delivery_method, delivery_status,
    deleted, deleted_at, created_at, updated_at,
    is_test:order_data->>is_test, test_environment:order_data->>test_environment,
    test_run_id:order_data->>testRunId,
    order_items(id, order_id, item_index, product_id, variation_id, description, quantity, unit_price, unit_discount, cost_price, handling_type, is_temporary_product)
`;

export const RECENT_DASHBOARD_ORDERS_COLUMNS = `
    id, order_number, order_index, status, order_type, customer_name, total_amount, created_at,
    is_test:order_data->>is_test, test_environment:order_data->>test_environment,
    test_run_id:order_data->>testRunId
`;

export const orderReadMetrics = {
  executions: 0,
  rows: 0,
  bytes: 0,
  durationMs: 0,
};

export const recordOrdersReadMetric = (rows: unknown[], startedAt: number) => {
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
