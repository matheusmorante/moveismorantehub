const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function run() {
    const { data, error } = await supabase.rpc('merge_product_variation_into_canonical', {
        p_non_canonical_variation_id: 'b466542a-6bbb-4d16-84ee-4236fcffe49f',
        p_canonical_variation_id: 'b466542a-6bbb-4d16-84ee-4236fcffe49f'
    });
    console.log('RPC Error:', error);
}

run();
