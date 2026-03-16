
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'erp/.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
    console.log('--- Database Fix & Inspection ---');

    // 1. Fix Products Table
    const sqlProducts = `
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
    
    -- Reload PostgREST schema cache
    NOTIFY pgrst, 'reload schema';
    `;

    console.log('Running product schema fix and cache reload...');
    const { error: err1 } = await supabase.rpc('execute_sql', { sql_query: sqlProducts });
    if (err1) console.error('Error fixing products:', err1);
    else console.log('Products schema fix sent successfully.');

    // 2. Inspect People Table
    console.log('\nInspecting PEOPLE table columns...');
    const sqlInspectPeople = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'people' AND table_schema = 'public';
    `;
    const { data: cols, error: err2 } = await supabase.rpc('execute_sql', { sql_query: sqlInspectPeople });
    if (err2) {
        console.error('Error inspecting people:', err2);
    } else {
        console.log('People columns:', cols.map(c => c.column_name).join(', '));
    }

    // 3. Inspect Products Table (Validation)
    console.log('\nInspecting PRODUCTS table columns (Validation)...');
    const { data: prodCols, error: err3 } = await supabase.rpc('execute_sql', { sql_query: sqlInspectPeople.replace("'people'", "'products'") });
    if (err3) {
        console.error('Error inspecting products:', err3);
    } else {
        console.log('Products columns:', prodCols.map(c => c.column_name).join(', '));
    }
}

run();
