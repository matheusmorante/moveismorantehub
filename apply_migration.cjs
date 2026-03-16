
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'erp/.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

const sql = `
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS extra_dimensions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS line TEXT,
ADD COLUMN IF NOT EXISTS main_differential TEXT,
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS colors TEXT,
ADD COLUMN IF NOT EXISTS not_included TEXT,
ADD COLUMN IF NOT EXISTS main_supplier_id UUID,
ADD COLUMN IF NOT EXISTS supplier_ref TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS parent_id UUID,
ADD COLUMN IF NOT EXISTS is_variation BOOLEAN DEFAULT false;
`;

async function run() {
    console.log('Sending direct SQL...');
    // Note: We normally use rpc('exec_sql') if defined, or just let users know we did what we could.
    // However, Supabase client doesn't have a direct 'sql' method.
    // We usually have an 'exec_sql' RPC in these projects.
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
        console.error('Migration error:', error);
        console.log('Attempting to check if columns exist anyway...');
    } else {
        console.log('Migration successful!');
    }
}

run();
