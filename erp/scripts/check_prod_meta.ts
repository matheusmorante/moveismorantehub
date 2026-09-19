import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const { data, error } = await supabase.from('products').select('id, category_id, category, item_type').eq('item_type', 'composition');
  console.log(JSON.stringify(data, null, 2));

  // Also query product_categories to see if it's there
  if (data && data.length > 0) {
      const { data: pc } = await supabase.from('product_categories').select('*').eq('product_id', data[0].id);
      console.log('product_categories:', JSON.stringify(pc, null, 2));
  }
}
run();
