const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  const triggers = await client.query(`
    SELECT 
      event_object_table as table_name,
      trigger_name,
      event_manipulation as event,
      action_timing as timing,
      action_statement as definition
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table IN ('orders', 'order_items', 'order_payments', 'inbound_invoices', 'inventory_moves', 'goods_receipts', 'purchases')
    ORDER BY event_object_table, trigger_name;
  `);

  console.log('=== TRIGGERS NAS TABELAS PRINCIPAIS ===');
  console.table(triggers.rows);

  await client.end();
}

run().catch(console.error);
