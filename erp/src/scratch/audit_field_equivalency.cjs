const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('=== AUDITORIA CAMPO A CAMPO: ESTRUTURA NORMALIZADA VS JSONB ===\n');

  // 1. status
  const statusAudit = await client.query(`
    SELECT
      COUNT(*) as total_orders,
      COUNT(status) as normalized_filled,
      COUNT(order_data->>'status') as json_filled,
      COUNT(CASE WHEN status IS DISTINCT FROM (order_data->>'status') THEN 1 END) as diff_count
    FROM public.orders;
  `);
  console.log('1. status:', statusAudit.rows[0]);

  // 2. order_type
  const typeAudit = await client.query(`
    SELECT
      COUNT(*) as total_orders,
      COUNT(order_type) as normalized_filled,
      COUNT(order_data->>'orderType') as json_filled,
      COUNT(CASE WHEN order_type IS DISTINCT FROM COALESCE(order_data->>'orderType', order_data->>'order_type', 'sale') THEN 1 END) as diff_count
    FROM public.orders;
  `);
  console.log('2. order_type:', typeAudit.rows[0]);

  // 3. order_index
  const indexAudit = await client.query(`
    SELECT
      COUNT(*) as total_orders,
      COUNT(order_index) as normalized_filled,
      COUNT(CASE WHEN (order_data->>'orderIndex') ~ '^[0-9]+$' THEN 1 END) as json_filled,
      COUNT(CASE WHEN order_index IS DISTINCT FROM (
        CASE 
          WHEN (order_data->>'orderIndex') ~ '^[0-9]+$' THEN (order_data->>'orderIndex')::integer
          WHEN (order_number) ~ '^[0-9]+$' THEN (order_number)::integer
          ELSE NULL
        END
      ) THEN 1 END) as diff_count
    FROM public.orders;
  `);
  console.log('3. order_index:', indexAudit.rows[0]);

  // 4. customer_name
  const custNameAudit = await client.query(`
    SELECT
      COUNT(*) as total_orders,
      COUNT(customer_name) as normalized_filled,
      COUNT(order_data#>>'{customerData,fullName}') as json_filled,
      COUNT(CASE WHEN TRIM(customer_name) IS DISTINCT FROM TRIM(COALESCE(order_data#>>'{customerData,fullName}', '')) AND order_data#>>'{customerData,fullName}' IS NOT NULL THEN 1 END) as diff_count
    FROM public.orders;
  `);
  console.log('4. customer_name:', custNameAudit.rows[0]);

  // 5. total_amount vs paymentsSummary.totalOrderValue
  const totalAudit = await client.query(`
    SELECT
      SUM(total_amount) as normalized_sum,
      SUM(COALESCE(NULLIF(order_data#>>'{paymentsSummary,totalOrderValue}', '')::numeric, total_amount)) as json_sum,
      COUNT(CASE WHEN total_amount IS DISTINCT FROM COALESCE(NULLIF(order_data#>>'{paymentsSummary,totalOrderValue}', '')::numeric, total_amount) THEN 1 END) as diff_count
    FROM public.orders;
  `);
  console.log('5. total_amount (monetário):', totalAudit.rows[0]);

  // 6. scheduled_date
  const schedAudit = await client.query(`
    SELECT
      COUNT(scheduled_date) as normalized_count,
      COUNT(CASE WHEN (order_data#>>'{shipping,scheduling,date}') ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN 1 END) as json_count,
      COUNT(CASE WHEN scheduled_date::text IS DISTINCT FROM (order_data#>>'{shipping,scheduling,date}') 
                 AND (order_data#>>'{shipping,scheduling,date}') ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN 1 END) as diff_count
    FROM public.orders;
  `);
  console.log('6. scheduled_date:', schedAudit.rows[0]);

  // 7. deleted
  const deletedAudit = await client.query(`
    SELECT
      COUNT(CASE WHEN deleted = true THEN 1 END) as normalized_deleted,
      COUNT(CASE WHEN (order_data->>'deleted')::boolean = true THEN 1 END) as json_deleted,
      COUNT(CASE WHEN deleted IS DISTINCT FROM COALESCE((order_data->>'deleted')::boolean, false) THEN 1 END) as diff_count
    FROM public.orders;
  `);
  console.log('7. deleted:', deletedAudit.rows[0]);

  // 8. stock_processed
  const stockAudit = await client.query(`
    SELECT
      COUNT(CASE WHEN stock_processed = true THEN 1 END) as normalized_stock,
      COUNT(CASE WHEN (order_data->>'stockProcessed')::boolean = true THEN 1 END) as json_stock,
      COUNT(CASE WHEN stock_processed IS DISTINCT FROM COALESCE((order_data->>'stockProcessed')::boolean, false) THEN 1 END) as diff_count
    FROM public.orders;
  `);
  console.log('8. stock_processed:', stockAudit.rows[0]);

  // 9. Itens por pedido: orders.items vs order_items
  const itemsPerOrderAudit = await client.query(`
    WITH json_counts AS (
      SELECT 
        o.id, 
        jsonb_array_length(CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END) as expected_count
      FROM public.orders o
    ),
    table_counts AS (
      SELECT 
        order_id, 
        COUNT(*) as actual_count
      FROM public.order_items
      GROUP BY order_id
    )
    SELECT
      COUNT(j.id) as total_orders_checked,
      SUM(j.expected_count) as total_json_items,
      COALESCE(SUM(t.actual_count), 0) as total_table_items,
      COUNT(CASE WHEN j.expected_count <> COALESCE(t.actual_count, 0) THEN 1 END) as orders_with_diff
    FROM json_counts j
    LEFT JOIN table_counts t ON j.id = t.order_id;
  `);
  console.log('9. itens por pedido (1.508 itens):', itemsPerOrderAudit.rows[0]);

  // 10. Pagamentos por pedido: orders.order_data->'payments' vs order_payments
  const paymentsPerOrderAudit = await client.query(`
    WITH json_counts AS (
      SELECT 
        o.id, 
        jsonb_array_length(CASE WHEN jsonb_typeof(o.order_data->'payments') = 'array' THEN o.order_data->'payments' ELSE '[]'::jsonb END) as expected_count
      FROM public.orders o
    ),
    table_counts AS (
      SELECT 
        order_id, 
        COUNT(*) as actual_count
      FROM public.order_payments
      GROUP BY order_id
    )
    SELECT
      COUNT(j.id) as total_orders_checked,
      SUM(j.expected_count) as total_json_payments,
      COALESCE(SUM(t.actual_count), 0) as total_table_payments,
      COUNT(CASE WHEN j.expected_count <> COALESCE(t.actual_count, 0) THEN 1 END) as orders_with_diff
    FROM json_counts j
    LEFT JOIN table_counts t ON j.id = t.order_id;
  `);
  console.log('10. pagamentos por pedido (949 pagamentos):', paymentsPerOrderAudit.rows[0]);

  console.log('\n=== FIM DA AUDITORIA DE EQUIVALÊNCIA ===');
  await client.end();
}

run().catch(console.error);
