const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

async function check() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('--- Testando tabela orders ---');
  const { data: ordersData, error: ordersErr, count: ordersCount } = await supabase
    .from('orders')
    .select('id, order_number, status, created_at', { count: 'exact' })
    .limit(5);
  console.log('orders error:', ordersErr);
  console.log('orders count:', ordersCount);
  console.log('orders sample:', ordersData?.length);

  console.log('\n--- Testando view/tabela order_list_items ---');
  const { data: viewData, error: viewErr, count: viewCount } = await supabase
    .from('order_list_items')
    .select('*', { count: 'exact' })
    .limit(5);
  console.log('order_list_items error:', viewErr);
  console.log('order_list_items count:', viewCount);
  console.log('order_list_items sample:', viewData?.length);
}

check();
