const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  const query = async (sql) => (await client.query(sql)).rows;

  // 1. Todas as tabelas do schema public
  const allTables = await query(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  // 2. Colunas de tabelas relevantes: orders, inbound_invoices, goods_receipts, purchases, inventory_moves, financial_transactions
  const targetTables = [
    'orders', 'inbound_invoices', 'goods_receipts', 'purchases', 
    'inventory_moves', 'financial_transactions', 'people', 'products',
    'product_variations', 'delivery_summaries', 'sefaz_nsu_control'
  ];

  const tableDetails = {};

  for (const t of targetTables) {
    const cols = await query(`
      SELECT 
        column_name, 
        data_type, 
        udt_name, 
        is_nullable, 
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${t}'
      ORDER BY ordinal_position;
    `);

    const countRes = await query(`SELECT COUNT(*) as count FROM public."${t}"`);
    const count = countRes[0].count;

    tableDetails[t] = {
      count: parseInt(count, 10),
      columns: cols
    };
  }

  // 3. Amostra de items em orders
  const orderItemsSample = await query(`
    SELECT id, order_number, jsonb_typeof(items) as items_type, jsonb_array_length(items) as items_len, items
    FROM public.orders
    WHERE items IS NOT NULL AND jsonb_typeof(items) = 'array' AND jsonb_array_length(items) > 0
    LIMIT 3;
  `);

  // 4. Amostra de order_data em orders
  const orderDataSample = await query(`
    SELECT id, order_number, order_data
    FROM public.orders
    WHERE order_data IS NOT NULL AND order_data != '{}'::jsonb
    LIMIT 2;
  `);

  // 5. Amostra de itens em inbound_invoices
  const inboundItemsSample = await query(`
    SELECT id, numero_nfe, jsonb_array_length(itens) as itens_len, itens
    FROM public.inbound_invoices
    WHERE itens IS NOT NULL AND jsonb_array_length(itens) > 0
    LIMIT 1;
  `);

  // 6. Amostra de items em purchases
  const purchaseItemsSample = await query(`
    SELECT id, supplier_name, jsonb_array_length(items) as items_len, items
    FROM public.purchases
    WHERE items IS NOT NULL AND jsonb_array_length(items) > 0
    LIMIT 1;
  `);

  const output = {
    allTables: allTables.map(t => `${t.table_name} (${t.table_type})`),
    tableDetails,
    orderItemsSample,
    orderDataSample,
    inboundItemsSample,
    purchaseItemsSample
  };

  fs.writeFileSync('src/scratch/detailed_audit_data.json', JSON.stringify(output, null, 2));
  console.log('Saved detailed audit data to src/scratch/detailed_audit_data.json');

  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
