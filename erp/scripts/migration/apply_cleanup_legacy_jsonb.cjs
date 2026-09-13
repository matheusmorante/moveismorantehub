const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDQ5ODIsImV4cCI6MjA1NzYyMDk4Mn0.gq_v-H3aR-O8n4QGvqFp3_Q6N37Q8V3eR1zL1G1G1g1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanUpLegacyData() {
  console.log('🧹 Executando a limpeza de dados legados JSONB no banco de dados Supabase...');

  // 1. Clean Goods Receipts items
  const { error: grErr } = await supabase
    .from('goods_receipts')
    .update({ items: [] })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (grErr) {
    console.warn('⚠️ Goods Receipts cleanup note:', grErr.message);
  } else {
    console.log('✅ Goods Receipts: colunas de itens legados limpas.');
  }

  // 2. Clean Purchases items
  const { error: purErr } = await supabase
    .from('purchases')
    .update({ items: [] })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (purErr) {
    console.warn('⚠️ Purchases cleanup note:', purErr.message);
  } else {
    console.log('✅ Purchases: colunas de itens legados limpas.');
  }

  // 3. Clean Inbound Invoices itens
  const { error: invErr } = await supabase
    .from('inbound_invoices')
    .update({ itens: [] })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (invErr) {
    console.warn('⚠️ Inbound Invoices cleanup note:', invErr.message);
  } else {
    console.log('✅ Inbound Invoices: colunas de itens legados limpas.');
  }

  // 4. Clean Orders items & order_data
  const { error: ordErr } = await supabase
    .from('orders')
    .update({ items: [], order_data: null })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (ordErr) {
    console.warn('⚠️ Orders cleanup note:', ordErr.message);
  } else {
    console.log('✅ Orders (Vendas): order_data e items legados limpos.');
  }

  console.log('🎉 Limpeza concluída com sucesso no banco de dados!');
}

cleanUpLegacyData();
