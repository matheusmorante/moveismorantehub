import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFrancineAndFloriza() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_name, status, order_data')
    .or('customer_name.ilike.%Francine Franco%,customer_name.ilike.%Floriza%');
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  for (const o of (orders || [])) {
    console.log("------------------");
    console.log("Order ID:", o.id);
    console.log("Customer:", o.customer_name);
    console.log("status column:", o.status);
    console.log("order_data.status:", o.order_data?.status);
    console.log("order_data.cancelled:", o.order_data?.cancelled);
    console.log("order_data.deleted:", o.order_data?.deleted);
    console.log("full order_data summary:", {
      status: o.order_data?.status,
      deleted: o.order_data?.deleted,
      scheduling: o.order_data?.shipping?.scheduling
    });
  }
}

inspectFrancineAndFloriza();
