import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function linkAttributes() {
  const { data: categories } = await supabase.from('categories').select('id, name').eq('type', 'category');
  const { data: attributes } = await supabase.from('attributes').select('id, name');

  const attrMap = {};
  attributes.forEach(a => { attrMap[a.name] = a.id; });

  const getAttrIds = (names) => names.map(n => attrMap[n]).filter(Boolean);

  const mappings = {
    // Guarda-Roupas / Roupeiros
    'Guarda-Roupas': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Espelhos', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Cômodas': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Espelhos', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Sapateiras': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Espelhos', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Mesas de Cabeceira': ['Estrutura', 'Cor', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Penteadeiras': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Espelhos', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],

    // Sala de Estar / Racks / Painéis
    'Racks': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Painéis': ['Estrutura', 'Cor', 'Espelhos', 'Acabamento', 'Complexidade da Montagem'],
    'Homes': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Espelhos', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Estantes': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Tipo de Pés', 'Acabamento', 'Complexidade da Montagem'],
    'Aparadores Buffets': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Espelhos', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Cristaleiras': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Espelhos', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],

    // Estofados / Sofás / Poltronas
    'Sofás': ['Estrutura', 'Cor', 'Tecido', 'Densidade da Espuma', 'Tipo de Pés', 'Complexidade da Montagem'],
    'Poltronas': ['Estrutura', 'Cor', 'Tecido', 'Densidade da Espuma', 'Tipo de Pés', 'Complexidade da Montagem'],

    // Cozinha
    'Cozinhas Moduladas e Compactas': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Armários Aéreos': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Balcões para Pia': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Balcões com Tampo': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Balcões para Cooktop': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Balcões para Filtro de Àgua': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Balcões com Fruteiras': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Paneleiros': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Armários para Fornos': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Pias': ['Estrutura', 'Cor'],
    'Tampos': ['Estrutura', 'Cor', 'Acabamento'],

    // Banheiro
    'Conjuntos para Banheiro': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Espelhos', 'Tipo de Puxador', 'Acabamento'],
    'Espelheira para Banheiro': ['Estrutura', 'Cor', 'Espelhos', 'Quantidade de portas', 'Tipo de Porta', 'Acabamento'],

    // Escritório
    'Mesas para Escritório': ['Estrutura', 'Cor', 'Quantidade de gavetas', 'Sistema de deslizamento da gaveta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem'],
    'Cadeiras para Escritório': ['Estrutura', 'Cor', 'Tecido', 'Densidade da Espuma', 'Tipo de Pés', 'Complexidade da Montagem'],

    // Sala de Jantar
    'Mesa para Sala de Jantar': ['Estrutura', 'Cor', 'Tipo de Pés', 'Acabamento', 'Complexidade da Montagem'],
    'Cadeiras para Sala de Jantar': ['Estrutura', 'Cor', 'Tecido', 'Densidade da Espuma', 'Tipo de Pés', 'Complexidade da Montagem'],
    'Conjunto para Sala de Jantar': ['Estrutura', 'Cor', 'Tecido', 'Tipo de Pés', 'Acabamento', 'Complexidade da Montagem'],

    // Quarto / Dormitório
    'Cabeceiras': ['Estrutura', 'Cor', 'Tecido', 'Densidade da Espuma', 'Complexidade da Montagem'],
    'Colchões': ['Estrutura', 'Cor', 'Tecido', 'Densidade da Espuma'],
    'Camas/Bases Box': ['Estrutura', 'Cor', 'Tecido', 'Tipo de Pés'],
    'Beliches': ['Estrutura', 'Cor', 'Complexidade da Montagem'],
    'Treliches': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Complexidade da Montagem'],
    'Berços': ['Estrutura', 'Cor', 'Acabamento', 'Complexidade da Montagem'],
    'Armários Multiuso': ['Estrutura', 'Cor', 'Quantidade de portas', 'Tipo de Porta', 'Tipo de Pés', 'Tipo de Puxador', 'Acabamento', 'Complexidade da Montagem']
  };

  let totalLinked = 0;
  for (const cat of categories) {
    const desiredAttrNames = mappings[cat.name] || ['Estrutura', 'Cor', 'Complexidade da Montagem'];
    const attrIds = getAttrIds(desiredAttrNames);

    // Deleta vínculos antigos desta categoria
    await supabase.from('category_attributes').delete().eq('category_id', cat.id);

    // Insere novos
    if (attrIds.length > 0) {
      const inserts = attrIds.map(attrId => ({
        category_id: cat.id,
        attribute_id: attrId,
        is_required: false
      }));
      const { error } = await supabase.from('category_attributes').insert(inserts);
      if (error) {
        console.error('Erro ao vincular para', cat.name, error);
      } else {
        totalLinked += inserts.length;
        console.log(`Vínculos OK [${cat.name}]: ${inserts.length} especificações técnicas`);
      }
    }
  }

  console.log(`\nConcluído! Total de ${totalLinked} vínculos gerados entre Categorias e Especificações Técnicas.`);
}

linkAttributes();
