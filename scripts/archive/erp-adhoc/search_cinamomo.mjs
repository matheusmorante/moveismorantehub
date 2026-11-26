import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

async function main() {
    // Procurar por produtos antigos que possam ser o pai original do Cinamomo/Branco
    const { data: products } = await supabase
        .from('products')
        .select('id, code, name, colors')
        .ilike('colors', '%Cinamomo%Branco%');

    console.log('Products matching Cinamomo/Branco:', JSON.stringify(products, null, 2));
    
    // Procurar nas variações
    const { data: variations } = await supabase
        .from('product_variations')
        .select('id, product_id, name, sku, image_url')
        .ilike('name', '%Cinamomo%Branco%');
        
    console.log('Variations matching Cinamomo/Branco:', JSON.stringify(variations, null, 2));
}

main().catch(console.error);
