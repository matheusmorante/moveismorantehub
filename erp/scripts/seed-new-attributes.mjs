import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const newAttrs = [
  {
    name: 'Tipo de Pés',
    options: ['Sem pés / Sapata', 'Madeira Maciça', 'Plástico / ABS', 'Metal / Ferro', 'Rodízios']
  },
  {
    name: 'Tipo de Puxador',
    options: ['Sem puxador', 'Alumínio / Metal', 'Madeira', 'Plástico / ABS', 'Embutido / Cava']
  },
  {
    name: 'Acabamento',
    options: ['Pintura UV', 'BP', 'Verniz', 'Fosco', 'Brilho', 'Semi-brilho']
  },
  {
    name: 'Complexidade da Montagem',
    options: ['Baixa', 'Média', 'Alta', 'Não necessita montagem']
  },
  {
    name: 'Densidade da Espuma',
    options: ['D18', 'D20', 'D23', 'D26', 'D28', 'D33', 'D45']
  }
];

async function run() {
  for (const item of newAttrs) {
    const { data: existing } = await supabase.from('attributes').select('id').eq('name', item.name).maybeSingle();
    let attrId = existing?.id;
    if (!attrId) {
      const { data: created, error } = await supabase.from('attributes').insert({
        name: item.name,
        active: true,
        is_globally_required: false
      }).select('id').single();
      if (error) { console.error('Erro attr:', item.name, error); continue; }
      attrId = created.id;
      console.log('Criado atributo:', item.name);
    } else {
      console.log('Atributo já existente:', item.name);
    }

    for (const opt of item.options) {
      const { data: valExists } = await supabase.from('attribute_values').select('id').eq('attribute_id', attrId).eq('value', opt).maybeSingle();
      if (!valExists) {
        await supabase.from('attribute_values').insert({
          attribute_id: attrId,
          value: opt
        });
      }
    }
  }
  console.log('Finalizado com sucesso!');
}

run();
