const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  const arCols = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts_receivable'
    ORDER BY ordinal_position;
  `);
  console.log('=== ACCOUNTS_RECEIVABLE ===');
  console.table(arCols.rows);

  const sample = await client.query('SELECT * FROM public.accounts_receivable LIMIT 1');
  console.log('Sample accounts_receivable:', sample.rows[0]);

  // Checar order_status_history
  const oshCols = await client.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_status_history'
    ORDER BY ordinal_position;
  `);
  console.log('=== ORDER_STATUS_HISTORY ===');
  console.table(oshCols.rows);

  await client.end();
}

run().catch(console.error);
