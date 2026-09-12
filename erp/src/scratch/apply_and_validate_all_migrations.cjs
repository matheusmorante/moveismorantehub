const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  console.log('Conectando ao PostgreSQL do Supabase...');
  await client.connect();
  console.log('Conectado com sucesso!\n');

  const migrations = [
    '20260912140000_create_inbound_invoice_items.sql',
    '20260912141000_create_goods_receipt_items.sql',
    '20260912142000_create_purchase_items.sql',
    '20260912143000_add_order_structured_columns.sql',
    '20260912144000_create_order_items.sql',
    '20260912145000_create_order_payments.sql',
    '20260912150000_update_order_list_items_view.sql'
  ];

  const migrationsDir = path.join(__dirname, '..', '..', '..', 'supabase', 'migrations');

  for (const m of migrations) {
    const filePath = path.join(migrationsDir, m);
    console.log(`[EXECUTANDO] ${m}...`);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`  -> Sucesso: ${m}\n`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  -> ERRO em ${m}:`, err.message);
      throw err;
    }
  }

  console.log('==============================================');
  console.log('EXECUTANDO VALIDAÇÕES E ASSERÇÕES PÓS-MIGRAÇÃO');
  console.log('==============================================\n');

  // 1. Validação inbound_invoice_items
  const invItemsCount = (await client.query('SELECT count(*) FROM public.inbound_invoice_items')).rows[0].count;
  console.log(`1. inbound_invoice_items: ${invItemsCount} itens migrados (esperado >= 21)`);
  if (parseInt(invItemsCount, 10) < 21) throw new Error('Falha na validação de inbound_invoice_items');

  // 2. Validação purchase_items
  const purItemsCount = (await client.query('SELECT count(*) FROM public.purchase_items')).rows[0].count;
  console.log(`2. purchase_items: ${purItemsCount} itens migrados (esperado >= 6)`);
  if (parseInt(purItemsCount, 10) < 6) throw new Error('Falha na validação de purchase_items');

  // 3. Validação goods_receipt_items
  const grItemsCount = (await client.query('SELECT count(*) FROM public.goods_receipt_items')).rows[0].count;
  console.log(`3. goods_receipt_items: ${grItemsCount} itens (tabela pronta)`);

  // 4. Validação orders colunas estruturadas
  const orderStats = (await client.query(`
    SELECT 
      count(*) as total_orders,
      count(order_type) as orders_with_type,
      count(order_index) as orders_with_index,
      count(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as orders_with_schedule
    FROM public.orders
  `)).rows[0];
  console.log('4. orders estatísticas:', orderStats);
  if (parseInt(orderStats.total_orders, 10) !== 849) throw new Error(`Total de pedidos alterado! Atual: ${orderStats.total_orders}`);
  if (parseInt(orderStats.orders_with_type, 10) !== 849) throw new Error('Nem todos os pedidos receberam order_type');

  // 5. Validação order_items
  const ordItemsCount = (await client.query('SELECT count(*) FROM public.order_items')).rows[0].count;
  console.log(`5. order_items: ${ordItemsCount} itens migrados (esperado >= 1508)`);
  if (parseInt(ordItemsCount, 10) < 1508) throw new Error(`Falha na validação de order_items! Encontrado: ${ordItemsCount}`);

  // 6. Validação order_payments
  const ordPaymentsCount = (await client.query('SELECT count(*) FROM public.order_payments')).rows[0].count;
  console.log(`6. order_payments: ${ordPaymentsCount} pagamentos migrados (esperado >= 849)`);
  if (parseInt(ordPaymentsCount, 10) < 849) throw new Error(`Falha na validação de order_payments! Encontrado: ${ordPaymentsCount}`);

  // 7. Validação da view order_list_items
  const viewSample = (await client.query('SELECT id, order_number, status, order_type, customer_name, total_value, delivery_method FROM public.order_list_items LIMIT 3')).rows;
  console.log('7. view order_list_items (amostra de 3 linhas):', viewSample);

  console.log('\n==============================================');
  console.log('TODAS AS MIGRAÇÕES FORAM APLICADAS E VALIDADAS COM SUCESSO!');
  console.log('==============================================');

  await client.end();
}

run().catch(err => {
  console.error('\nFALHA NO PROCESSO DE MIGRAÇÃO:', err);
  process.exit(1);
});
