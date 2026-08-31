import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: allOrders, error } = await supabase.from('orders').select('id, created_at, order_data').order('created_at', { ascending: true });

console.log("Total de pedidos no banco:", allOrders?.length);

let maxNumeric = 0;
let withoutIndex = 0;
let withNumericId = 0;
let withOrderIndex = 0;

for (const o of (allOrders || [])) {
  const numId = Number(o.id);
  const numIndex = Number(o.order_data?.orderIndex);
  
  if (Number.isInteger(numId) && numId > 0) {
    withNumericId++;
    if (numId > maxNumeric) maxNumeric = numId;
  } else if (Number.isInteger(numIndex) && numIndex > 0) {
    withOrderIndex++;
    if (numIndex > maxNumeric) maxNumeric = numIndex;
  } else {
    withoutIndex++;
  }
}

console.log({ maxNumeric, withNumericId, withOrderIndex, withoutIndex });
