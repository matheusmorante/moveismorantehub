const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzMjI5NzMsImV4cCI6MjA1NTg5ODk3M30.z8D9490mC9Hj1k3X9gT6W7G3-V4m2q9S_9Q5F2U3X4Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixSkus() {
    console.log("=== INSPECCIONANDO E ATUALIZANDO SKUS NO SUPABASE ===");
    
    // Buscar todos os produtos ordenados por data ou id
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, code, sku, slug, created_at')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Erro ao buscar produtos:", error);
        return;
    }

    console.log(`Encontrados ${products.length} produtos.`);

    let nextSkuNumber = 1;

    for (const p of products) {
        const sequentialSku = String(nextSkuNumber).padStart(6, '0');
        console.log(`Produto ID: ${p.id} | Nome: "${p.name}" | Atual code: "${p.code}" | Atual sku: "${p.sku}" -> NOVO SKU: "${sequentialSku}"`);

        // Atualizar produto no Supabase
        const { error: updateErr } = await supabase
            .from('products')
            .update({ 
                code: sequentialSku, 
                sku: sequentialSku 
            })
            .eq('id', p.id);

        if (updateErr) {
            console.error(`Erro ao atualizar produto ${p.id}:`, updateErr);
        }

        // Buscar variações do produto se houver
        const { data: variations, error: varErr } = await supabase
            .from('product_variations')
            .select('id, sku, name')
            .eq('product_id', p.id);

        if (!varErr && variations && variations.length > 0) {
            let varIdx = 1;
            for (const v of variations) {
                const varSku = `${sequentialSku}-${String(varIdx).padStart(2, '0')}`;
                console.log(`   -> Variação ID: ${v.id} | SKU antigo: "${v.sku}" -> NOVO SKU: "${varSku}"`);
                
                await supabase
                    .from('product_variations')
                    .update({ sku: varSku })
                    .eq('id', v.id);

                varIdx++;
            }
        }

        nextSkuNumber++;
    }

    console.log("\n=== SKUS ATUALIZADOS COM SUCESSO EM TODOS OS PRODUTOS E VARIAÇÕES! ===");
}

fixSkus();
