import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhcacvmdlffpydptvpl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Se não tiver chave de serviço, usa anônima
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aGNhY3ZtZGxmZnB5ZHB0dnBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3NTY3MzAsImV4cCI6MjA0MjMzMjczMH0.c4e9v66hXm81qC8P59eWj0uC5FhWn0i4fO5n7bM9i7w';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

async function checkSellers() {
  console.log('--- Verificando perfis em profiles ---');
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, phone');
  
  if (pErr) console.error('Erro profiles:', pErr);
  else console.log('Perfis:', JSON.stringify(profiles, null, 2));

  console.log('\n--- Verificando últimos 5 pedidos em orders ---');
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, code, customer_name, seller, order_data')
    .order('created_at', { ascending: false })
    .limit(5);

  if (oErr) console.error('Erro orders:', oErr);
  else {
    orders?.forEach(o => {
      const d = o.order_data || {};
      console.log(`Pedido ${o.code || o.id}:`);
      console.log(`  seller raiz: ${o.seller}`);
      console.log(`  d.seller: ${d.seller}`);
      console.log(`  d.sellerName: ${d.sellerName}`);
      console.log(`  d.sellerPhone: ${d.sellerPhone}`);
      console.log(`  d.sellerData: ${JSON.stringify(d.sellerData)}`);
      console.log(`  d.customerData: ${JSON.stringify(d.customerData?.fullName || d.customerData?.name)} - Tel: ${d.customerData?.phone || d.customerData?.cellphone}`);
    });
  }
}

checkSellers();
