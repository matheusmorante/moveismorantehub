import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllVariations() {
  const { data: products } = await supabase.from('products').select('id, name, active, is_draft, status, deleted');
  const { data: variations } = await supabase.from('product_variations').select('*');

  const activeProducts = (products || []).filter(p => p.active !== false && !p.is_draft && p.status !== 'draft' && !p.deleted);
  const activeProductIds = new Set(activeProducts.map(p => p.id));

  const activeVariations = (variations || []).filter(v => activeProductIds.has(v.product_id));

  const varsByProduct = {};
  activeVariations.forEach(v => {
    if (!varsByProduct[v.product_id]) varsByProduct[v.product_id] = [];
    varsByProduct[v.product_id].push(v);
  });

  const productsWithVars = activeProducts.filter(p => varsByProduct[p.id] && varsByProduct[p.id].length > 0);
  const productsWithoutVars = activeProducts.filter(p => !varsByProduct[p.id] || varsByProduct[p.id].length === 0);

  console.log('=== RESUMO EXATO DO BANCO DE DADOS ===');
  console.log(`1. Total de Produtos Pai Ativos: ${activeProducts.length}`);
  console.log(`2. Total de registros em product_variations vinculados a produtos ativos: ${activeVariations.length}`);
  console.log(`3. Produtos Pai com variações cadastradas na tabela product_variations: ${productsWithVars.length}`);
  console.log(`4. Produtos Pai sem variação em product_variations: ${productsWithoutVars.length}`);
}

checkAllVariations();




