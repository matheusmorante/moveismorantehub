const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function run() {
    const { data, error } = await supabase.from('product_variation_suppliers').select('*').limit(1);
    console.log('Select Error:', error);
}

run();
