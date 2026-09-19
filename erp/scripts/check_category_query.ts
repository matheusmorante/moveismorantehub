import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '');

export const LIGHT_COLUMNS = "id, name, code, description, brand, category_id, category, condition, opportunity_id, width, height, depth, unit_price, cost_price, freight_type, freight_cost, ipi_percent, final_purchase_price, promo_price, initial_stock, stock, min_stock, unit, active, is_draft, status, deleted, supplier_id, supplier_ids, images, has_variations, item_type, created_at, updated_at, slug, featured";
export const LIGHT_COLUMNS_WITH_CATS = LIGHT_COLUMNS + ", product_categories(*, categories(*)), product_variations(*), product_images(*), category_details:category_id(id, name)";

async function run() {
  const { data, error } = await supabase.from('products').select(LIGHT_COLUMNS_WITH_CATS).eq('item_type', 'composition').limit(1);
  console.log("Category ID:", data?.[0]?.category_id);
  console.log("Category Details:", data?.[0]?.category_details);
}
run();
