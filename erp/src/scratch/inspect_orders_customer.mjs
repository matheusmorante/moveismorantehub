import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: orders, error } = await supabase.from('orders').select('id, customer_name, order_data, created_at').limit(10);
  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }
  console.log("Found orders:", orders.length);
  for (const o of orders) {
    const od = o.order_data || {};
    console.log(`Order ${o.id}:`);
    console.log(`  customer_name (column):`, o.customer_name);
    console.log(`  customerData in json:`, JSON.stringify(od.customerData || null));
    console.log(`  shipping in json:`, JSON.stringify(od.shipping || null));
  }
}

inspect();
