const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testMapped() {
    const { data: products, error } = await supabase
        .from('products')
        .select(`
            *,
            product_variations (*)
        `)
        .order('created_at', { ascending: true })
        .limit(5);

    if (error) {
        console.error(error);
        return;
    }

    products.forEach((p, idx) => {
        const productNum = String(idx + 1).padStart(6, '0');
        const mainSku = p.sku || p.code || productNum;
        console.log(`\nProduct [${idx + 1}]: ID=${p.id}`);
        console.log(`  Name: ${p.name}`);
        console.log(`  DB sku field: ${p.sku}`);
        console.log(`  DB code field: ${p.code}`);
        console.log(`  Calculated SKU: ${mainSku}`);
        if (p.product_variations && p.product_variations.length > 0) {
            console.log(`  Variations count: ${p.product_variations.length}`);
            p.product_variations.forEach(v => {
                console.log(`    Var: ${v.name} -> SKU: ${v.sku}`);
            });
        }
    });
}

testMapped();
