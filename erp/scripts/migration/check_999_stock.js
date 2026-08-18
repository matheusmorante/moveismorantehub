const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  console.log('Buscando variações com estoque 999...');
  const { data, error } = await supabase
    .from('product_variations')
    .select('id, name, stock');
  
  if (error) {
    console.error('Erro ao buscar:', error);
    return;
  }

  const variationsWith999 = data.filter(v => v.stock === 999);
  console.log(`Total de variações no banco: ${data.length}`);
  console.log(`Variações com estoque 999: ${variationsWith999.length}`);
  if (variationsWith999.length > 0) {
    console.log('Exemplos:', variationsWith999.slice(0, 5));
    
    // Tenta atualizar a primeira para 0 para ver se o update com a anon key funciona
    console.log('Tentando atualizar a primeira para 0...');
    const { error: updateError, data: updateData } = await supabase
      .from('product_variations')
      .update({ stock: 0 })
      .eq('id', variationsWith999[0].id)
      .select();
      
    if (updateError) {
      console.error('Erro ao atualizar com anon key:', updateError);
    } else {
      console.log('Sucesso no update! Retorno:', updateData);
    }
  }
}

run();
