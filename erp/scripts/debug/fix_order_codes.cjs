
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

async function fixOrderCodes() {
    console.log("Starting order code sync...");

    // 1. Fetch products
    const { data: products, error: pError } = await supabase
        .from('products')
        .select('id, code, variations');

    if (pError) {
        console.error("Error fetching products:", pError);
        return;
    }

    const productMap = new Map();
    const variationMap = new Map();

    products.forEach(p => {
        productMap.set(String(p.id), p.code);
        if (p.variations) {
            p.variations.forEach(v => {
                variationMap.set(String(v.id), v.sku);
            });
        }
    });

    // 2. Fetch orders
    const { data: orders, error: oError } = await supabase
        .from('orders')
        .select('id, order_data');

    if (oError) {
        console.error("Error fetching orders:", oError);
        return;
    }

    console.log(`Checking ${orders.length} orders...`);

    let updatedCount = 0;

    for (const order of orders) {
        let changed = false;
        const items = order.order_data?.items || [];

        for (const item of items) {
            let correctCode = null;
            
            if (item.variationId && variationMap.has(String(item.variationId))) {
                correctCode = variationMap.get(String(item.variationId));
            } else if (item.productId && productMap.has(String(item.productId))) {
                correctCode = productMap.get(String(item.productId));
            }

            if (correctCode && item.code !== correctCode) {
                console.log(`Order ${order.id}: Updating item ${item.description} code ${item.code || "NULL"} -> ${correctCode}`);
                item.code = correctCode;
                changed = true;
            }
        }

        if (changed) {
            const { error: uError } = await supabase
                .from('orders')
                .update({ order_data: order.order_data })
                .eq('id', order.id);
            
            if (uError) {
                console.error(`Error updating order ${order.id}:`, uError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Sync complete! ${updatedCount} orders updated.`);
}

fixOrderCodes();
