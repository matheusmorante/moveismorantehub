const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

async function checkOrderCols() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Keys in orders table:');
  console.log(Object.keys(data[0]));
  console.log('\nSample order:');
  console.log('id:', data[0].id);
  console.log('order_number:', data[0].order_number);
  console.log('status:', data[0].status);
  console.log('order_data preview:', JSON.stringify(data[0].order_data).substring(0, 200));
}

checkOrderCols();
