
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Environment variables missing");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAroma() {
    const { data: products, error } = await supabase
        .from('products')
        .select('id, description, code, variations')
        .ilike('description', '%Aroma%');

    if (error) {
        console.error(error);
        return;
    }

    products.forEach(p => {
        console.log(`Product: ${p.description} (${p.code})`);
        if (p.variations) {
            p.variations.forEach(v => {
                console.log(`  - Variation: ${v.name} SKU: ${v.sku || 'MISSING'}`);
            });
        }
    });
}

checkAroma();
