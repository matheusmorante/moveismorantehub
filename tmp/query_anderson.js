
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function findAnderson() {
    console.log("Searching in 'orders'...");
    const { data: orders, error: oError } = await supabase
        .from('orders')
        .select('id, order_data')
        .ilike('order_data->customerData->>fullName', '%Anderson Pugsley%');
    
    if (oError) console.error("Orders Error:", oError);
    else console.log("Found in orders:", JSON.stringify(orders, null, 2));

    console.log("\nSearching in 'showroom_assemblies'...");
    const { data: showroom, error: sError } = await supabase
        .from('showroom_assemblies')
        .select('*'); // Showroom usually doesn't have names, but let's check
    
    if (sError) console.error("Showroom Error:", sError);
    else {
        const filtered = showroom.filter(s => JSON.stringify(s).toLowerCase().includes('anderson'));
        console.log("Found in showroom_assemblies (filtered):", JSON.stringify(filtered, null, 2));
    }
}

findAnderson();
