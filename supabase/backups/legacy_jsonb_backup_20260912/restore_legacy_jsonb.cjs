/**
 * Script de Rollback / Restauração do backup JSONB legado.
 * Executar caso haja qualquer necessidade de restaurar as colunas JSONB originais nas tabelas.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../../erp/.env');
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

async function restore() {
  console.log('🔄 Iniciando restauração/rollback do backup JSONB legado...');

  // Restore Goods Receipts
  const grPath = path.join(__dirname, 'goods_receipts_items_legacy_dump.json');
  if (fs.existsSync(grPath)) {
    const rows = JSON.parse(fs.readFileSync(grPath, 'utf8'));
    for (const r of rows) {
      if (r.items) {
        await supabase.from('goods_receipts').update({ items: r.items }).eq('id', r.id);
      }
    }
    console.log('✅ Goods Receipts restaurados.');
  }

  // Restore Purchases
  const purPath = path.join(__dirname, 'purchases_items_legacy_dump.json');
  if (fs.existsSync(purPath)) {
    const rows = JSON.parse(fs.readFileSync(purPath, 'utf8'));
    for (const r of rows) {
      if (r.items) {
        await supabase.from('purchases').update({ items: r.items }).eq('id', r.id);
      }
    }
    console.log('✅ Purchases restaurados.');
  }

  // Restore Inbound Invoices
  const invPath = path.join(__dirname, 'inbound_invoices_items_legacy_dump.json');
  if (fs.existsSync(invPath)) {
    const rows = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    for (const r of rows) {
      if (r.items) {
        await supabase.from('inbound_invoices').update({ items: r.items }).eq('id', r.id);
      }
    }
    console.log('✅ Inbound Invoices restauradas.');
  }

  // Restore Sales Orders
  const ordPath = path.join(__dirname, 'sales_orders_order_data_legacy_dump.json');
  if (fs.existsSync(ordPath)) {
    const rows = JSON.parse(fs.readFileSync(ordPath, 'utf8'));
    for (const r of rows) {
      const updates = {};
      if (r.order_data) updates.order_data = r.order_data;
      if (r.items) updates.items = r.items;
      if (Object.keys(updates).length > 0) {
        await supabase.from('sales_orders').update(updates).eq('id', r.id);
      }
    }
    console.log('✅ Sales Orders restaurados.');
  }

  console.log('🎉 Restauração concluída com sucesso!');
}

restore();
