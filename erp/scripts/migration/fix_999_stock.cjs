const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI'; // ANON KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

async function run() {
  console.log('Iniciando correção de estoque 999...');

  try {
    // 1. Atualizar estoque na tabela product_variations
    console.log('Atualizando tabela product_variations...');
    const { data: vars, error: varError } = await supabase
      .from('product_variations')
      .select('id, name, stock')
      .eq('stock', 999);

    if (varError) throw varError;

    console.log(`Encontradas ${vars.length} variações com estoque 999 na tabela product_variations.`);
    for (const v of vars) {
      const { error: updateError } = await supabase
        .from('product_variations')
        .update({ stock: 0 })
        .eq('id', v.id);
      if (updateError) {
        console.error(`Erro ao atualizar variação ${v.name}:`, updateError);
      } else {
        console.log(`Variação ${v.name} (estoque 999 -> 0) atualizada com sucesso.`);
      }
    }

    // 2. Atualizar estoque na tabela products (produtos principais)
    console.log('Atualizando tabela products (produtos principais)...');
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, variations, has_variations');

    if (prodError) throw prodError;

    let updatedProductsCount = 0;
    for (const p of products) {
      let needsUpdate = false;
      const updatePayload = {};

      // Se tiver variações no campo JSON, corrigimos o estoque delas lá também
      if (p.variations && Array.isArray(p.variations)) {
        let variationsChanged = false;
        const newVariations = p.variations.map(v => {
          if (v.stock === 999) {
            variationsChanged = true;
            console.log(`Variação JSON ${v.name} do produto ${p.name} tem estoque 999. Definindo para 0.`);
            return { ...v, stock: 0 };
          }
          return v;
        });

        if (variationsChanged) {
          updatePayload.variations = newVariations;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('products')
          .update(updatePayload)
          .eq('id', p.id);
        
        if (updateError) {
          console.error(`Erro ao atualizar produto ${p.name}:`, updateError);
        } else {
          updatedProductsCount++;
          console.log(`Produto ${p.name} atualizado com sucesso.`);
        }
      }
    }

    console.log(`Total de ${updatedProductsCount} produtos atualizados na tabela products.`);
    console.log('Correção de estoque concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a execução do script:', error);
  }
}

run();
