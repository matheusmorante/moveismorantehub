import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data, error } = await supabase.from('orders').select('id, created_at, order_data').order('created_at', { ascending: false }).limit(10);
console.log("Pedidos recentes:", data?.map(o => ({
  id: o.id,
  createdAt: o.created_at,
  order_data_id: o.order_data?.id,
  orderIndex: o.order_data?.orderIndex,
  orderNumber: o.order_data?.orderNumber
})));
