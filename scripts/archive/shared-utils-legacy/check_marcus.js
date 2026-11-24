
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from erp app
dotenv.config({ path: 'apps/erp/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMarcusOrder() {
    console.log('Searching for orders containing "Marcus"...');
    const { data: rawOrders, error } = await supabase
        .from('orders')
        .select('*');

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    const marcusOrders = rawOrders.filter(row => {
        const orderData = row.order_data;
        const name = orderData?.customerData?.fullName || '';
        return name.toLowerCase().includes('marcus');
    });

    if (marcusOrders.length === 0) {
        console.log('No orders found for "Marcus".');
        return;
    }

    marcusOrders.forEach(row => {
        const o = row.order_data;
        console.log(`\nOrder ID: ${row.id}`);
        console.log(`Customer: ${o.customerData?.fullName}`);
        console.log(`Status: ${o.status}`);
        console.log(`Type: ${o.orderType}`);
        
        console.log('Items:');
        (o.items || []).forEach((item, i) => {
            console.log(`  [${i}] ${item.description} - ID: ${item.productId || 'MISSING'}`);
        });

        if (o.assistanceItems) {
            console.log('Assistance Items:');
            o.assistanceItems.forEach((item, i) => {
                console.log(`  [${i}] ${item.description} - Original Order: ${item.originalOrderId || 'N/A'}`);
            });
        }
    });

    // Also check products table for potential matches
    console.log('\nChecking products table for potentially missing items...');
    const { data: products } = await supabase.from('products').select('id, title').limit(10);
    console.log('Available products (sample):', products?.map(p => p.title).join(', '));
}

checkMarcusOrder();
