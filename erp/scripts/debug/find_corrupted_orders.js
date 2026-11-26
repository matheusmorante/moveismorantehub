import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('--- FINDING CORRUPTED ORDERS ---');
    const { data: orders } = await supabase.from('orders').select('id, order_data');
    
    const corrupted = orders.filter(o => 
        !o.order_data?.paymentsSummary?.totalOrderValue || 
        o.order_data?.paymentsSummary?.totalOrderValue === 0
    );
    
    console.log(`Found ${corrupted.length} orders with zero totalOrderValue`);
    corrupted.forEach(o => {
        console.log(`ID: ${o.id}, Customer: ${o.order_data?.customerData?.fullName}, TotalValue (legacy): ${o.order_data?.paymentsSummary?.totalValue}`);
    });
}

run();
