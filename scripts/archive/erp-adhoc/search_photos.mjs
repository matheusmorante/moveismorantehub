import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

async function main() {
    const { data: parentImages } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', '5f44c0e1-1596-4f27-adc8-9f0afce089f7');
        
    console.log('Parent 000314 images:', JSON.stringify(parentImages, null, 2));
    
    const { data: varData } = await supabase
        .from('product_variations')
        .select('id, name, sku, attributes, image_url')
        .eq('id', 'd0388a28-79f9-4d68-9be5-fe2bda5641ef')
        .single();
        
    console.log('Variation Capuccino/Terracota:', JSON.stringify(varData, null, 2));
}

main().catch(console.error);
