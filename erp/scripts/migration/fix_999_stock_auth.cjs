const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const AUDIT_USER = 'matheusmorante002@gmail.com';
const AUDIT_PASS = 'Morantenho@12345';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Iniciando autenticação no banco novo do Supabase...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: AUDIT_USER,
    password: AUDIT_PASS
  });

  if (authError) {
    console.error('Erro na autenticação do Supabase:', authError.message);
    return;
  }

  console.log('Autenticado com sucesso! Token obtido.');

  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  await client.auth.setSession(authData.session);

  console.log('Buscando variações com estoque 999...');
  const { data: vars, error: selectError } = await client
    .from('product_variations')
    .select('id, name, stock')
    .eq('stock', 999);

  if (selectError) {
    console.error('Erro ao buscar variações:', selectError);
    return;
  }

  console.log(`Encontradas ${vars.length} variações com estoque 999.`);

  let updatedVarsCount = 0;
  for (const v of vars) {
    const { data: updateData, error: updateError } = await client
      .from('product_variations')
      .update({ stock: 0 })
      .eq('id', v.id)
      .select();

    if (updateError) {
      console.error(`Erro ao atualizar variação ${v.name}:`, updateError);
    } else {
      updatedVarsCount += (updateData || []).length;
      console.log(`Variação ${v.name} atualizada com sucesso (estoque 999 -> 0).`);
    }
  }

  console.log(`\nTotal de variações atualizadas na tabela product_variations: ${updatedVarsCount}`);

  // Agora vamos atualizar na tabela products (campo JSON variations se houver algum com 999)
  console.log('\nBuscando produtos para verificar campo JSON variations...');
  const { data: products, error: prodError } = await client
    .from('products')
    .select('id, name, variations');

  if (prodError) {
    console.error('Erro ao buscar produtos:', prodError);
    return;
  }

  let updatedProductsCount = 0;
  for (const p of products) {
    if (p.variations && Array.isArray(p.variations)) {
      let changed = false;
      const newVariations = p.variations.map(v => {
        if (v.stock === 999) {
          changed = true;
          return { ...v, stock: 0 };
        }
        return v;
      });

      if (changed) {
        console.log(`Atualizando produto ${p.name} (correção do JSON de variações)...`);
        const { error: updateError } = await client
          .from('products')
          .update({ variations: newVariations })
          .eq('id', p.id);

        if (updateError) {
          console.error(`Erro ao atualizar JSON do produto ${p.name}:`, updateError);
        } else {
          updatedProductsCount++;
          console.log(`Produto ${p.name} atualizado com sucesso.`);
        }
      }
    }
  }

  console.log(`Total de produtos atualizados na tabela products: ${updatedProductsCount}`);
  console.log('\nProcesso de correção concluído!');
}

run();
