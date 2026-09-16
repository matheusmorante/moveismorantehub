import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: vars } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', '78443664-c211-45d1-bc97-fd556a8d764f');
    
    console.log('Variations for this product:', vars);

    // Let's also check if there's any JSONB data in the product itself
    const { data: prod } = await supabase
        .from('products')
        .select('variations')
        .eq('id', '78443664-c211-45d1-bc97-fd556a8d764f');
        
    console.log('Product variations JSONB field:', prod);
}

run();
