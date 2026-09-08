const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

async function testOrdersQuery() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const start = Date.now();
  const { data, count, error } = await supabase
    .from('orders')
    .select('id, order_number, status, customer_name, total_amount, created_at, updated_at, order_data', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 29);

  console.log('Duration:', Date.now() - start, 'ms');
  console.log('Error:', error);
  console.log('Count:', count);
  console.log('Data length:', data?.length);
  if (data && data.length > 0) {
    console.log('First order sample:');
    console.log('id:', data[0].id);
    console.log('order_number:', data[0].order_number);
    console.log('customer_name:', data[0].customer_name);
    console.log('status:', data[0].status);
    console.log('total_amount:', data[0].total_amount);
  }
}

testOrdersQuery();
