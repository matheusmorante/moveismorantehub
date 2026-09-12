const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT 
      id,
      order_data->>'deletedAt' as raw_val,
      CASE 
        WHEN (order_data->>'deletedAt') ~ '^\\d{2}/\\d{2}/\\d{4}' 
          THEN to_timestamp(order_data->>'deletedAt', 'DD/MM/YYYY, HH24:MI:SS')
        WHEN (order_data->>'deletedAt') ~ '^\\d{4}-\\d{2}-\\d{2}' 
          THEN (order_data->>'deletedAt')::timestamptz
        ELSE NULL
      END as parsed_val
    FROM public.orders
    WHERE order_data->>'deletedAt' IS NOT NULL;
  `);
  console.log(`Successfully parsed ${res.rows.length} deletedAt dates.`);
  console.table(res.rows.slice(0, 5));
  await client.end();
}

run().catch(console.error);
