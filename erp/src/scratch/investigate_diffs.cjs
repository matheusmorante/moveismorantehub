const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log('=== INVESTIGANDO DIFFS ===\n');

  // 1. deleted diff
  const delDiff = await client.query(`
    SELECT id, order_number, deleted, order_data->>'deleted' as json_deleted
    FROM public.orders
    WHERE (order_data->>'deleted')::boolean = true
    LIMIT 5;
  `);
  console.log('Sample deleted diff:');
  console.table(delDiff.rows);

  // 2. stockProcessed diff
  const stockDiff = await client.query(`
    SELECT id, order_number, stock_processed, order_data->>'stockProcessed' as json_stock
    FROM public.orders
    WHERE (order_data->>'stockProcessed')::boolean = true
    LIMIT 5;
  `);
  console.log('Sample stockProcessed diff:');
  console.table(stockDiff.rows);

  // 3. status diff
  const statusDiff = await client.query(`
    SELECT id, order_number, status, order_data->>'status' as json_status
    FROM public.orders
    WHERE status IS DISTINCT FROM (order_data->>'status')
    LIMIT 10;
  `);
  console.log('Sample status diff:');
  console.table(statusDiff.rows);

  // 4. order_type diff
  const typeDiff = await client.query(`
    SELECT id, order_number, order_type, order_data->>'orderType' as json_type, order_data->>'order_type' as json_type2
    FROM public.orders
    WHERE order_type IS DISTINCT FROM COALESCE(order_data->>'orderType', order_data->>'order_type', 'sale')
    LIMIT 10;
  `);
  console.log('Sample order_type diff:');
  console.table(typeDiff.rows);

  // 5. total_amount diff
  const totalDiff = await client.query(`
    SELECT id, order_number, total_amount, order_data#>>'{paymentsSummary,totalOrderValue}' as json_total
    FROM public.orders
    WHERE total_amount IS DISTINCT FROM COALESCE(NULLIF(order_data#>>'{paymentsSummary,totalOrderValue}', '')::numeric, total_amount)
    LIMIT 10;
  `);
  console.log('Sample total_amount diff:');
  console.table(totalDiff.rows);

  await client.end();
}

run().catch(console.error);
