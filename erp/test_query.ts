import { supabase } from './src/pages/utils/supabaseConfig';

async function test() {
    console.log("Testing address query...");
    const { data, error } = await supabase
        .from('people')
        .select('address')
        .ilike('address->>street', '%silva%')
        .limit(10);
    
    console.log("Data:", data);
    console.log("Error:", error);
}

test();
