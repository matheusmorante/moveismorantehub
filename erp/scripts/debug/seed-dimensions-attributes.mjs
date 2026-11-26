import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const dimensionAttrs = ['Altura', 'Largura', 'Profundidade', 'Peso'];

async function run() {
  const { data: categories } = await supabase.from('categories').select('id').eq('type', 'category');
  
  for (const name of dimensionAttrs) {
    let { data: attr } = await supabase.from('attributes').select('id').eq('name', name).maybeSingle();
    let attrId = attr?.id;
    if (!attrId) {
      const { data: created, error } = await supabase.from('attributes').insert({
        name,
        active: true,
        is_globally_required: false
      }).select('id').single();
      if (error) { console.error('Erro attr:', name, error); continue; }
      attrId = created.id;
      console.log('Criado atributo:', name);
    } else {
      console.log('Atributo já existia:', name);
    }

    // Vincular a todas as categorias
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        const { data: exists } = await supabase.from('category_attributes')
          .select('id')
          .eq('category_id', cat.id)
          .eq('attribute_id', attrId)
          .maybeSingle();
        if (!exists) {
          await supabase.from('category_attributes').insert({
            category_id: cat.id,
            attribute_id: attrId,
            is_required: false
          });
        }
      }
    }
  }
  console.log('Dimensões vinculadas a todas as categorias com sucesso!');
}

run();
