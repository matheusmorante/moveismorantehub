const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('--- TABLE: products ---');
    const { data: products, error: pError } = await supabase.from('products').select('*').limit(1);
    if (pError) console.error(pError);
    else console.log('Columns:', Object.keys(products[0] || {}));

    console.log('\n--- TABLE: variations ---');
    const { data: variations, error: vError } = await supabase.from('variations').select('*').limit(1);
    if (vError) console.error(vError);
    else console.log('Columns:', Object.keys(variations[0] || {}));

    console.log('\n--- TABLE: sales_orders (or orders) ---');
    const { data: orders, error: oError } = await supabase.from('sales_orders').select('*').limit(1);
    if (oError) {
        const { data: orders2, error: oError2 } = await supabase.from('orders').select('*').limit(1);
        if (oError2) console.error('Neither sales_orders nor orders found.');
        else console.log('Table "orders" found. Columns:', Object.keys(orders2[0] || {}));
    } else {
        console.log('Table "sales_orders" found. Columns:', Object.keys(orders[0] || {}));
    }
    
    console.log('\n--- TABLE: sales_order_items ---');
    const { data: items, error: iError } = await supabase.from('sales_order_items').select('*').limit(1);
    if (iError) console.error(iError);
    else console.log('Columns:', Object.keys(items[0] || {}));
}

inspectSchema();
