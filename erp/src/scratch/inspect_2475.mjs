import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectOrder2475() {
  const { data: orders, error } = await supabase.from('orders').select('*');
  if (error) {
    console.error(error);
    return;
  }
  
  for (const o of (orders || [])) {
    const od = o.order_data || {};
    const obs = od.observation || o.notes || '';
    if (obs.includes('Devolução vinculada') || obs.includes('2475') || od.orderIndex === 2475 || od.orderIndex === '2475') {
      console.log(`Order ${o.id}: type=${od.orderType}, index=${od.orderIndex}, returnOrderId=${od.returnOrderId}`);
      console.log(`  observation:`, od.observation);
      console.log(`  notes column:`, o.notes);
    }
  }
}

inspectOrder2475();
