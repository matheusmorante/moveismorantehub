const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('Executando ajuste de precisão de backfill...');
  await client.query('BEGIN');

  await client.query(`
    UPDATE public.orders o
    SET
      order_type = COALESCE(NULLIF(o.order_data->>'orderType', ''), NULLIF(o.order_data->>'order_type', ''), o.order_type, 'sale'),
      deleted = COALESCE((o.order_data->>'deleted')::boolean, o.deleted, false),
      stock_processed = COALESCE((o.order_data->>'stockProcessed')::boolean, o.stock_processed, false),
      is_stock_checked = COALESCE((o.order_data->>'isStockChecked')::boolean, o.is_stock_checked, false),
      is_registered_in_bling = COALESCE((o.order_data->>'isRegisteredInBling')::boolean, o.is_registered_in_bling, false)
    WHERE o.order_data IS NOT NULL;
  `);

  await client.query('COMMIT');
  console.log('Ajuste concluído. Verificando equivalência...');

  // Re-auditar
  const res = await client.query(`
    SELECT
      -- order_type
      COUNT(CASE WHEN order_type IS DISTINCT FROM COALESCE(NULLIF(order_data->>'orderType', ''), NULLIF(order_data->>'order_type', ''), 'sale') THEN 1 END) as order_type_diff,
      -- deleted
      COUNT(CASE WHEN deleted IS DISTINCT FROM COALESCE((order_data->>'deleted')::boolean, false) THEN 1 END) as deleted_diff,
      -- stock_processed
      COUNT(CASE WHEN stock_processed IS DISTINCT FROM COALESCE((order_data->>'stockProcessed')::boolean, false) THEN 1 END) as stock_diff,
      -- total_amount comparado com arredondamento monetário de 2 casas decimais
      COUNT(CASE WHEN total_amount IS DISTINCT FROM ROUND(COALESCE(NULLIF(order_data#>>'{paymentsSummary,totalOrderValue}', '')::numeric, total_amount), 2) THEN 1 END) as total_amount_diff
    FROM public.orders;
  `);

  console.log('Resultado da re-auditoria de equivalência:');
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
