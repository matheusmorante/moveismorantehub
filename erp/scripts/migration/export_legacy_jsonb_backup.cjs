const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDQ5ODIsImV4cCI6MjA1NzYyMDk4Mn0.gq_v-H3aR-O8n4QGvqFp3_Q6N37Q8V3eR1zL1G1G1g1';

const supabase = createClient(supabaseUrl, supabaseKey);

const backupDir = path.resolve(__dirname, '../../../supabase/backups/legacy_jsonb_backup_20260912');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function exportBackup() {
  console.log('🚀 Iniciando backup dos dados legados JSONB e schemas de mapeamento...');

  // 1. Goods Receipts
  const { data: grData, error: grErr } = await supabase.from('goods_receipts').select('id, items, created_at');
  if (!grErr && grData) {
    fs.writeFileSync(
      path.join(backupDir, 'goods_receipts_items_legacy_dump.json'),
      JSON.stringify(grData, null, 2),
      'utf8'
    );
    console.log(`✅ Goods Receipts Backup: ${grData.length} registros exportados.`);
  } else {
    console.warn('⚠️ Falha ao exportar goods_receipts:', grErr);
  }

  // 2. Purchases
  const { data: purData, error: purErr } = await supabase.from('purchases').select('id, items, created_at');
  if (!purErr && purData) {
    fs.writeFileSync(
      path.join(backupDir, 'purchases_items_legacy_dump.json'),
      JSON.stringify(purData, null, 2),
      'utf8'
    );
    console.log(`✅ Purchases Backup: ${purData.length} registros exportados.`);
  } else {
    console.warn('⚠️ Falha ao exportar purchases:', purErr);
  }

  // 3. Inbound Invoices
  const { data: invData, error: invErr } = await supabase.from('inbound_invoices').select('id, chave_acesso, itens, created_at');
  if (!invErr && invData) {
    fs.writeFileSync(
      path.join(backupDir, 'inbound_invoices_items_legacy_dump.json'),
      JSON.stringify(invData, null, 2),
      'utf8'
    );
    console.log(`✅ Inbound Invoices Backup: ${invData.length} registros exportados.`);
  } else {
    console.warn('⚠️ Falha ao exportar inbound_invoices:', invErr);
  }

  // 4. Orders
  const { data: ordData, error: ordErr } = await supabase.from('orders').select('id, order_number, order_index, order_data, items, created_at');
  if (!ordErr && ordData) {
    fs.writeFileSync(
      path.join(backupDir, 'orders_order_data_legacy_dump.json'),
      JSON.stringify(ordData, null, 2),
      'utf8'
    );
    console.log(`✅ Orders Backup: ${ordData.length} registros exportados.`);
  } else {
    console.warn('⚠️ Falha ao exportar orders:', ordErr);
  }

  // 5. Mapping Schema Backup
  const mappingSchema = {
    backupDate: new Date().toISOString(),
    version: '1.0.0',
    description: 'Esquema completo de mapeamento das colunas legadas JSONB para as tabelas físicas normalizadas do ERP Morante Hub',
    tables: {
      goods_receipts: {
        legacy_column: 'items (JSONB)',
        normalized_table: 'public.goods_receipt_items',
        foreign_key: 'goods_receipt_items.receipt_id -> goods_receipts.id',
        field_mappings: {
          'items[].productId': 'goods_receipt_items.product_id (UUID)',
          'items[].variationId': 'goods_receipt_items.variation_id (UUID)',
          'items[].description': 'goods_receipt_items.description (TEXT)',
          'items[].quantity': 'goods_receipt_items.quantity (NUMERIC)',
          'items[].baseCost': 'goods_receipt_items.base_cost (NUMERIC)',
          'items[].unitCost': 'goods_receipt_items.unit_cost (NUMERIC)',
          'items[].freightFiscalUnit': 'goods_receipt_items.freight_fiscal_unit (NUMERIC)',
          'items[].freightNonFiscalUnit': 'goods_receipt_items.freight_non_fiscal_unit (NUMERIC)',
          'items[].discountUnit': 'goods_receipt_items.discount_unit (NUMERIC)',
          'items[].otherExpensesFiscalUnit': 'goods_receipt_items.other_expenses_fiscal_unit (NUMERIC)',
          'items[].otherExpensesNonFiscalUnit': 'goods_receipt_items.other_expenses_non_fiscal_unit (NUMERIC)',
          'items[].additionalCostUnit': 'goods_receipt_items.additional_cost_unit (NUMERIC)'
        }
      },
      purchases: {
        legacy_column: 'items (JSONB)',
        normalized_table: 'public.purchase_items',
        foreign_key: 'purchase_items.purchase_id -> purchases.id',
        field_mappings: {
          'items[].productId': 'purchase_items.product_id (TEXT/UUID)',
          'items[].variationId': 'purchase_items.variation_id (TEXT/UUID)',
          'items[].description': 'purchase_items.description (TEXT)',
          'items[].quantity': 'purchase_items.quantity (NUMERIC)',
          'items[].baseCost': 'purchase_items.base_cost (NUMERIC)',
          'items[].unitCost': 'purchase_items.unit_cost (NUMERIC)',
          'items[].totalCost': 'purchase_items.total_cost (NUMERIC)'
        }
      },
      inbound_invoices: {
        legacy_column: 'items (JSONB)',
        normalized_table: 'public.inbound_invoice_items',
        foreign_key: 'inbound_invoice_items.inbound_invoice_id -> inbound_invoices.id',
        field_mappings: {
          'items[].productId': 'inbound_invoice_items.product_id (UUID)',
          'items[].variationId': 'inbound_invoice_items.variation_id (UUID)',
          'items[].description': 'inbound_invoice_items.description (TEXT)',
          'items[].quantity': 'inbound_invoice_items.quantity (NUMERIC)',
          'items[].unitPrice': 'inbound_invoice_items.unit_price (NUMERIC)',
          'items[].totalPrice': 'inbound_invoice_items.total_price (NUMERIC)'
        }
      },
      sales_orders: {
        legacy_column: 'order_data (JSONB) / items (JSONB)',
        normalized_table: 'public.sales_orders (colunas físicas) + public.order_items + public.order_payments',
        foreign_key: 'order_items.order_id -> sales_orders.id',
        field_mappings: {
          'order_data.orderIndex / orderNumber': 'sales_orders.order_index / sales_orders.order_number',
          'order_data.status': 'sales_orders.status',
          'order_data.customerData.id': 'sales_orders.customer_id',
          'order_data.customerData.fullName': 'sales_orders.customer_name',
          'order_data.seller': 'sales_orders.seller_name',
          'order_data.paymentsSummary.totalOrderValue': 'sales_orders.total_amount',
          'order_data.items[]': 'public.order_items',
          'order_data.payments[]': 'public.order_payments'
        }
      }
    }
  };

  fs.writeFileSync(
    path.join(backupDir, 'mapping_schema_backup.json'),
    JSON.stringify(mappingSchema, null, 2),
    'utf8'
  );
  console.log('✅ Esquema de Mapeamento exportado com sucesso para mapping_schema_backup.json!');

  // 6. Criar o script autônomo de Rollback / Restauração
  const rollbackScriptContent = `/**
 * Script de Rollback / Restauração do backup JSONB legado.
 * Executar caso haja qualquer necessidade de restaurar as colunas JSONB originais nas tabelas.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../../erp/.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\\n');
  lines.forEach(line => {
    const match = line.match(/^\\s*([^#=]+)\\s*=\\s*(.*)$/);
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
`;

  fs.writeFileSync(
    path.join(backupDir, 'restore_legacy_jsonb.cjs'),
    rollbackScriptContent,
    'utf8'
  );
  console.log('✅ Script autônomo de Rollback exportado para restore_legacy_jsonb.cjs!');
}

exportBackup();
