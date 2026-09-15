const { createClient } = require('@supabase/supabase-js');
const url = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(url, key);

async function reconcile() {
  console.log('Iniciando reconciliacao de status de produtos...');
  const { data: prods, error } = await supabase
    .from('products')
    .select('id, name, active, is_draft, deleted, product_variations(id, active)')
    .eq('deleted', false);

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return;
  }

  let updatedCount = 0;
  for (const p of prods) {
    const vars = p.product_variations || [];
    if (vars.length > 0) {
      const anyActive = vars.some(v => v.active === true);
      const shouldBeActive = anyActive;

      if (p.active !== shouldBeActive) {
        console.log('Ajustando produto: "' + p.name + '" (ID: ' + p.id + ') de active=' + p.active + ' para active=' + shouldBeActive);
        const { error: updateError } = await supabase
          .from('products')
          .update({ active: shouldBeActive, updated_at: new Date().toISOString() })
          .eq('id', p.id);

        if (updateError) {
          console.error('Erro ao atualizar ' + p.id + ':', updateError);
        } else {
          updatedCount++;
        }
      }
    }
  }

  console.log('Reconciliacao concluida. Total de produtos atualizados: ' + updatedCount);
}
reconcile();
