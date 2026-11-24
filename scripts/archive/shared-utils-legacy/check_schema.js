import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/erp/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("--- Checking table columns ---");
    const { data: cols, error: colsErr } = await supabase.rpc('get_table_columns', { table_name: 'products' });
    
    if (colsErr) {
        console.log("RPC 'get_table_columns' failed or not exists. Trying direct select...");
        const { data, error } = await supabase.from('products').select('*').limit(1);
        if (error) {
            console.error('Error fetching one row:', error);
        } else if (data && data.length > 0) {
            console.log('Columns found in data:', Object.keys(data[0]));
        } else {
            console.log('No data found to check columns.');
        }
    } else {
        console.log('Columns from RPC:', cols);
    }
}

checkColumns();
