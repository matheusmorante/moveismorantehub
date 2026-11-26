import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('--- INSPECTING ALL KALINE ORDERS ---');
    
    // Check all orders
    const { data: orders, error } = await supabase.from('orders').select('id, order_data');
    
    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    const kalineOrders = orders.filter(o => 
        o.order_data?.customerData?.fullName?.toLowerCase().includes('kaline')
    );
    
    console.log(`Found ${kalineOrders.length} orders for Kaline:`);
    kalineOrders.forEach(o => {
        console.log(`ID: ${o.id}`);
        console.log(`Status: ${o.order_data?.status}`);
        console.log(`Total Value: ${o.order_data?.paymentsSummary?.totalValue}`);
        console.log(`Full Name: ${o.order_data?.customerData?.fullName}`);
        console.log(`Items count: ${o.order_data?.items?.length}`);
    });
}

run();
