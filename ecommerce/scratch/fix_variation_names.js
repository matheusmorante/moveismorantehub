const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Buscando produtos e suas variações no banco de dados...");
  
  // Buscar produtos publicados e suas variações
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, product_variations(*)')
    .is('deleted_at', null);

  if (error) {
    console.error("Erro ao buscar produtos:", error);
    return;
  }

  console.log(`Total de produtos analisados: ${products.length}`);
  
  let toUpdate = [];

  for (const p of products) {
    const variations = p.product_variations || [];
    for (const v of variations) {
      // Se estiver setado para herdar do pai (use_parent_name !== false) e o nome for diferente
      const shouldInherit = v.use_parent_name !== false;
      const nameDiffers = v.name !== p.name;

      if (shouldInherit && nameDiffers) {
        toUpdate.push({
          id: v.id,
          parentName: p.name,
          currentName: v.name,
          sku: v.sku
        });
      }
    }
  }

  console.log(`Encontradas ${toUpdate.length} variações que precisam ser atualizadas.`);

  if (toUpdate.length === 0) {
    console.log("Todas as variações já estão com os nomes corretos!");
    return;
  }

  console.log("Iniciando a atualização no banco de dados...");

  let updatedCount = 0;
  for (const item of toUpdate) {
    const { error: updateError } = await supabase
      .from('product_variations')
      .update({ name: item.parentName })
      .eq('id', item.id);

    if (updateError) {
      console.error(`Erro ao atualizar variação ID ${item.id} (SKU: ${item.sku}):`, updateError.message);
    } else {
      console.log(`[SUCESSO] Atualizado SKU: ${item.sku || item.id} | De: "${item.currentName}" -> Para: "${item.parentName}"`);
      updatedCount++;
    }
  }

  console.log(`\nAtualização concluída com sucesso! ${updatedCount} de ${toUpdate.length} variações foram corrigidas.`);
}

run();
