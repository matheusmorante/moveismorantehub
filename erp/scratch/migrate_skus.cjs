const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function migrateSkus() {
    console.log("=== INICIANDO MIGRAÇÃO DE SKUS SEQUENCIAIS ===");
    
    // 1. Tentar adicionar coluna 'sku' via RPC ou via rest update se já existir
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, slug, created_at')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Erro ao ler produtos:", error);
        return;
    }

    console.log(`Buscados ${products.length} produtos do Supabase.`);

    let currentNum = 1;
    for (const p of products) {
        const productSku = String(currentNum).padStart(6, '0');
        console.log(`[Produto ${currentNum}/${products.length}] ID: ${p.id} | Nome: "${p.name}" -> NOVO SKU: "${productSku}"`);

        // Tenta atualizar a coluna 'sku' (se existir) ou envia objeto com 'sku'
        const { error: updateErr } = await supabase
            .from('products')
            .update({ sku: productSku })
            .eq('id', p.id);

        if (updateErr) {
            console.log(`   Notice (products.sku): ${updateErr.message}`);
        } else {
            console.log(`   -> SUCESSO: SKU ${productSku} gravado na tabela products!`);
        }

        // Buscar e atualizar variações deste produto
        const { data: variations } = await supabase
            .from('product_variations')
            .select('id, name, sku')
            .eq('product_id', p.id)
            .order('created_at', { ascending: true });

        if (variations && variations.length > 0) {
            let vIdx = 1;
            for (const v of variations) {
                const varSku = `${productSku}-${String(vIdx).padStart(2, '0')}`;
                console.log(`      -> [Variação] ID: ${v.id} | SKU antigo: "${v.sku}" -> NOVO SKU: "${varSku}"`);
                
                const { error: varUpdateErr } = await supabase
                    .from('product_variations')
                    .update({ sku: varSku })
                    .eq('id', v.id);

                if (varUpdateErr) {
                    console.error(`      Erro ao atualizar variação ${v.id}:`, varUpdateErr);
                }
                vIdx++;
            }
        }

        currentNum++;
    }

    console.log("\n=== MIGRAÇÃO DE SKUS CONCLUÍDA COM SUCESSO! ===");
}

migrateSkus();
