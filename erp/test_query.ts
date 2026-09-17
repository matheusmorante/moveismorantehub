import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function run() {
    let res1 = await supabase.from('product_variations')
        .select('id, name, sku, product:products!inner(name, description, supplier_id)')
        .eq('product.supplier_id', 'b466542a-6bbb-4d16-84ee-4236fcffe49f')
        .limit(1);
    console.log('Result 1 (product.supplier_id):', res1.error);

    let res2 = await supabase.from('product_variations')
        .select('id, name, sku, product:products!inner(name, description, supplier_id)')
        .eq('products.supplier_id', 'b466542a-6bbb-4d16-84ee-4236fcffe49f')
        .limit(1);
    console.log('Result 2 (products.supplier_id):', res2.error);
}

run().catch(console.error);
