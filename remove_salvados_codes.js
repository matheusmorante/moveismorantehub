require('dotenv').config({ path: 'erp/.env' });
const { createClient } = require('@supabase/supabase-js');

const sbUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const sbKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(sbUrl, sbKey, { auth: { persistSession: false } });

async function run() {
  const { data: suppliers, error: supErr } = await supabase
    .from('people')
    .select('id, stock_origins')
    .eq('type', 'suppliers');

  if (supErr) {
    console.error('Error fetching suppliers:', supErr);
    return;
  }

  const salvadosIds = suppliers
    .filter(s => s.stock_origins && s.stock_origins.includes('salvados') && !s.stock_origins.includes('normal'))
    .map(s => s.id);

  if (salvadosIds.length === 0) {
    console.log('No suppliers found with only salvados/usados.');
    return;
  }

  for (const id of salvadosIds) {
    console.log('Removing codes for supplier:', id);
    const { error: delErr, count } = await supabase
      .from('product_supplier_codes')
      .delete({ count: 'exact' })
      .eq('supplier_id', id);
    if (delErr) {
      console.error('Error deleting:', delErr);
    } else {
      console.log('Deleted', count, 'codes for supplier', id);
    }
  }
}
run();
