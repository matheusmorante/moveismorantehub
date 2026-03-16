
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'erp/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    // Try .env.local
    require('dotenv').config({ path: path.join(__dirname, 'erp/.env.local') });
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Target URL:', url);

const supabase = createClient(url, key);

async function checkColumns() {
    console.log('Fetching products sample...');
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log('Columns found:', columns);
        if (columns.includes('extra_dimensions')) {
            console.log('extra_dimensions EXISTS');
        } else {
            console.log('extra_dimensions MISSING');
        }
    } else {
        console.log('No products found to inspect.');
    }
}

checkColumns();
