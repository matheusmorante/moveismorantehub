import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSellerSnapshot() {
  const { data: orders, error } = await supabase.from('orders').select('id, seller, seller_id, order_data').limit(20);
  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }
  
  const { data: people } = await supabase.from('people').select('*');
  console.log("Total people:", people?.length);
  
  let ordersWithoutSeller = 0;
  for (const o of (orders || [])) {
    const od = o.order_data || {};
    console.log(`Order ${o.id}: seller=${o.seller || od.seller}, sellerId=${o.seller_id || od.sellerId}`);
  }
}

inspectSellerSnapshot();
