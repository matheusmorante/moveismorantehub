const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT DISTINCT order_data->>'deletedAt' as val
    FROM public.orders
    WHERE order_data->>'deletedAt' IS NOT NULL
    LIMIT 25;
  `);
  console.table(res.rows);
  await client.end();
}

run().catch(console.error);
