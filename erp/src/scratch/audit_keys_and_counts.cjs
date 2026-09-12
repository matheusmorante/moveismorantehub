const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  // 1. Chaves de items em orders
  const orderItemKeys = await client.query(`
    SELECT jsonb_object_keys(item) as key, count(*) as count
    FROM public.orders,
    LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END) as item
    GROUP BY 1
    ORDER BY count DESC;
  `);

  // 2. Total de itens e pedidos com itens
  const orderStats = await client.query(`
    SELECT 
      count(distinct o.id) as orders_with_items,
      count(item) as total_items_count,
      (SELECT count(*) FROM public.orders) as total_orders
    FROM public.orders o,
    LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END) as item;
  `);

  // 3. Chaves de order_data em orders
  const orderDataKeys = await client.query(`
    SELECT jsonb_object_keys(order_data) as key, count(*) as count
    FROM public.orders
    WHERE order_data IS NOT NULL AND jsonb_typeof(order_data) = 'object'
    GROUP BY 1
    ORDER BY count DESC;
  `);

  // 4. Chaves de itens em inbound_invoices
  const inboundItemKeys = await client.query(`
    SELECT jsonb_object_keys(item) as key, count(*) as count
    FROM public.inbound_invoices,
    LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(itens) = 'array' THEN itens ELSE '[]'::jsonb END) as item
    GROUP BY 1
    ORDER BY count DESC;
  `);

  const inboundStats = await client.query(`
    SELECT 
      count(distinct inv.id) as invoices_with_items,
      count(item) as total_inbound_items,
      (SELECT count(*) FROM public.inbound_invoices) as total_invoices
    FROM public.inbound_invoices inv,
    LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(itens) = 'array' THEN itens ELSE '[]'::jsonb END) as item;
  `);

  // 5. Chaves de items em purchases
  const purchaseItemKeys = await client.query(`
    SELECT jsonb_object_keys(item) as key, count(*) as count
    FROM public.purchases,
    LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END) as item
    GROUP BY 1
    ORDER BY count DESC;
  `);

  const purchaseStats = await client.query(`
    SELECT 
      count(distinct p.id) as purchases_with_items,
      count(item) as total_purchase_items,
      (SELECT count(*) FROM public.purchases) as total_purchases
    FROM public.purchases p,
    LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(items) = 'array' THEN items ELSE '[]'::jsonb END) as item;
  `);

  // 6. Contagem de tabelas financeiras
  const apCount = (await client.query(`SELECT count(*) FROM public.accounts_payable`)).rows[0].count;
  const arCount = (await client.query(`SELECT count(*) FROM public.accounts_receivable`)).rows[0].count;
  const ftCount = (await client.query(`SELECT count(*) FROM public.financial_transactions`)).rows[0].count;

  const result = {
    orders: {
      stats: orderStats.rows[0],
      itemKeys: orderItemKeys.rows,
      orderDataKeys: orderDataKeys.rows
    },
    inboundInvoices: {
      stats: inboundStats.rows[0],
      itemKeys: inboundItemKeys.rows
    },
    purchases: {
      stats: purchaseStats.rows[0],
      itemKeys: purchaseItemKeys.rows
    },
    finance: {
      accountsPayableCount: parseInt(apCount, 10),
      accountsReceivableCount: parseInt(arCount, 10),
      financialTransactionsCount: parseInt(ftCount, 10)
    }
  };

  fs.writeFileSync('src/scratch/audit_summary.json', JSON.stringify(result, null, 2));
  console.log('Saved to src/scratch/audit_summary.json');
  console.log(JSON.stringify(result, null, 2));

  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
