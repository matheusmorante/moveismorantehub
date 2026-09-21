import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('--- BUSCANDO ATRIBUTOS ---');
  const { data: attrs } = await supabase.from('technical_specifications').select('id, name, options');
  const tipoPortaAttr = attrs?.find(a => a.name.toLowerCase().includes('tipo de porta') || a.name.toLowerCase().includes('tipo da porta'));
  const qtdPortaAttr = attrs?.find(a => a.name.toLowerCase().includes('quantidade de porta'));
  
  console.log('Tipo de Porta Attr:', JSON.stringify(tipoPortaAttr));
  console.log('Qtd Portas Attr:', JSON.stringify(qtdPortaAttr));

  console.log('\n--- BUSCANDO PRODUTOS ---');
  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase.from('products')
      .select('id, name, description, technical_specs')
      .is('deleted_at', null)
      .range(from, from + 199);
    if (error) {
      console.error(error);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 200) break;
    from += 200;
  }
  console.log('Total produtos cadastrados:', all.length);

  const comPorta = [];
  const semPorta = [];

  for (const p of all) {
    const text = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
    const specs = p.technical_specs?.technicalValues || {};
    const qtd = specs['Quantidade de portas'] || specs['Quantidade de Portas'];
    const temMencaoPorta = text.includes('porta') || (qtd && qtd !== 'Não se aplica' && qtd !== '0' && qtd !== 0);
    
    if (temMencaoPorta) {
      comPorta.push({ id: p.id, name: p.name, qtd, textSnippet: text.slice(0, 150) });
    } else {
      semPorta.push({ id: p.id, name: p.name });
    }
  }

  console.log(`Produtos com indício de porta: ${comPorta.length}`);
  console.log(`Produtos sem indício de porta: ${semPorta.length}`);
}

run();
