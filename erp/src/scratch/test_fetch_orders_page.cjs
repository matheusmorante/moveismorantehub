const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hkoxhourxwlddgsfdgws.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI'
);

async function testQuery() {
  console.log('Testing query with new columns on Supabase...');

  // 1. Listagem padrão (vendas ativas não canceladas, paginadas em 30)
  const { data: sales, count, error } = await supabase
    .from('orders')
    .select('id, order_number, status, order_type, customer_name, total_amount, created_at, scheduled_date', { count: 'exact' })
    .or('deleted.is.null,deleted.eq.false')
    .not('order_type', 'in', '(budget,assistance,return)')
    .order('created_at', { ascending: false })
    .range(0, 9);

  if (error) {
    console.error('Error querying orders:', error);
    process.exit(1);
  }

  console.log(`Total active sales count: ${count}`);
  console.log(`Returned ${sales.length} rows. Sample:`);
  console.table(sales.slice(0, 5));

  // 2. Testar busca na tabela order_items
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('id, order_id, description, quantity, unit_price, cost_price')
    .limit(5);

  if (itemsErr) {
    console.error('Error querying order_items:', itemsErr);
    process.exit(1);
  }

  console.log(`\norder_items sample:`);
  console.table(items);

  // 3. Testar busca na tabela order_payments
  const { data: payments, error: payErr } = await supabase
    .from('order_payments')
    .select('id, order_id, payment_method, amount, status')
    .limit(5);

  if (payErr) {
    console.error('Error querying order_payments:', payErr);
    process.exit(1);
  }

  console.log(`\norder_payments sample:`);
  console.table(payments);

  // 4. Testar busca na view order_list_items
  const { data: viewData, count: viewCount, error: viewErr } = await supabase
    .from('order_list_items')
    .select('id, order_number, status, order_type, customer_name, total_value, scheduled_date', { count: 'exact' })
    .range(0, 4);

  if (viewErr) {
    console.error('Error querying order_list_items view:', viewErr);
    process.exit(1);
  }

  console.log(`\norder_list_items view count: ${viewCount}, sample:`);
  console.table(viewData);

  console.log('\nALL CLIENT QUERIES TESTED AND PASSED 100%!');
}

testQuery().catch(console.error);
