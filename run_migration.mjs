
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'erp/.env') });

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

NOTIFY pgrst, 'reload schema';
`;

async function run() {
    console.log('Sending migration...');
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    if (error) {
        console.error('Migration error:', error);
    } else {
        console.log('Migration successful!', data);
    }
    process.exit(0);
}

run();
