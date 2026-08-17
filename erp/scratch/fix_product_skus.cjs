const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixAllVariationSkus() {
    console.log("=== INICIANDO ATUALIZAÇÃO DE SKUS DE VARIAÇÕES NO SUPABASE ===");

    // Buscar todos os produtos ordenados por data de criação
    const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, name, created_at')
        .order('created_at', { ascending: true });

    if (prodErr || !products) {
        console.error("Erro ao buscar produtos:", prodErr);
        return;
    }

    console.log(`Encontrados ${products.length} produtos.`);

    let updatedCount = 0;

    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const parentCode = String(i + 1).padStart(6, '0');

        // Buscar variações do produto
        const { data: vars, error: varErr } = await supabase
            .from('product_variations')
            .select('id, name, sku')
            .eq('product_id', p.id)
            .order('created_at', { ascending: true });

        if (varErr || !vars || vars.length === 0) continue;

        let vIdx = 1;
        for (const v of vars) {
            const cleanSku = `${parentCode}-${String(vIdx).padStart(2, '0')}`;
            console.log(`Produto [${parentCode}] "${p.name}" -> Variação "${v.name}" | SKU Antigo: "${v.sku}" -> NOVO SKU: "${cleanSku}"`);

            const { error: updateErr } = await supabase
                .from('product_variations')
                .update({ sku: cleanSku })
                .eq('id', v.id);

            if (updateErr) {
                console.error(`Erro ao atualizar variação ${v.id}:`, updateErr);
            } else {
                updatedCount++;
            }
            vIdx++;
        }
    }

    console.log(`\n=== SUCESSO! Total de ${updatedCount} variações atualizadas com SKUs numéricos/limpos! ===`);
}

fixAllVariationSkus();
