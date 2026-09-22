const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'erp/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('products').select('*, product_images(*), product_variations(*), product_categories(*, categories(name)), opportunities(*)').limit(100);
  if (error) return console.error(error);
  const size = Buffer.byteLength(JSON.stringify(data));
  console.log(`Size for 100 products: ${(size / 1024).toFixed(2)} KB`);
  console.log(`Estimated for 5000 products: ${((size * 50) / 1024 / 1024).toFixed(2)} MB`);
}
test();
