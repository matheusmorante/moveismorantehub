import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'apps/erp/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('products')
        .select('id, description, is_draft, deleted')
        .ilike('description', '%Criado Mudo Aroma%');
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Result:', data);
    }
}

check();
