require('dotenv').config({ path: 'erp/.env' });
const { createClient } = require('@supabase/supabase-js');
const sbUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const sbKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(sbUrl, sbKey);

async function test() {
  const { data, error } = await supabase
    .from('product_variations')
    .select('id, products!inner(id, product_kind)')
    .or('product_kind.eq.normal,product_kind.is.null', { foreignTable: 'products' })
    .limit(1);
  console.log(error || 'Success', data);
}
test();
