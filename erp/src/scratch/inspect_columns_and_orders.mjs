import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumnsAndOrders() {
  const { data: orders, error } = await supabase.from('orders').select('*').limit(5);
  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }
  
  if (orders && orders.length > 0) {
    console.log("Order table columns:", Object.keys(orders[0]));
    for (const o of orders) {
      const od = o.order_data || {};
      console.log(`Order ${o.id}: customer_id=${o.customer_id}, customer_name=${o.customer_name}`);
      console.log(`  order_data.customerData:`, od.customerData);
      console.log(`  order_data.seller:`, od.seller, `sellerId:`, od.sellerId);
    }
  }
}

inspectColumnsAndOrders();
