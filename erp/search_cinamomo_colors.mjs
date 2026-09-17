import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

async function main() {
    const parentIds = [
        "c0cda89f-8971-4146-bce7-0c4ead887f24", // 000312
        "204bb4ab-9e0f-4c05-af1a-7ed23162a368", // 000265
        "96a16c93-d899-49e8-9e4e-aa188d6c2744"  // 000281
    ];

    const { data: prods } = await supabase.from('products').select('id, code, description, colors, name').in('id', parentIds);
    console.log('Products:', JSON.stringify(prods, null, 2));
    
    // Tentar achar pelo texto
    const { data: cinaProducts } = await supabase.from('products').select('id, code, colors, name').ilike('colors', '%Cinamomo%');
    console.log('Cinamomo products:', JSON.stringify(cinaProducts, null, 2));
}

main().catch(console.error);
