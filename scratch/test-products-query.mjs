process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'erp/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const query = `
    id, name, description, code, unit_price, cost_price,
    price, promo_price, stock, active, deleted_at, has_variations,
    category, unit, images, is_combo,
    variations:product_variations(
        id, name, description, sku, price, promo_price, stock, image_url, active
    )
  `;
  const { data, error } = await supabase
    .from('products')
    .select(query)
    .is('deleted_at', null)
    .order('description', { ascending: true })
    .range(0, 5);

  console.log('Query result error:', error);
  console.log('Query success, count:', data?.length);
  if (data && data[0]) {
    console.log('Sample product:', { id: data[0].id, name: data[0].name, code: data[0].code, variations: data[0].variations?.length });
  }
}
test();
