import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function determineDoorType(product) {
  const name = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const text = `${name} ${desc}`;
  const specs = product.technical_specs?.technicalValues || {};

  // Verifica se tem quantidade de portas informada
  const qtdPortaRaw = specs['Quantidade de portas'] || specs['Quantidade de Portas'];
  let temQtdPortas = false;
  if (qtdPortaRaw && qtdPortaRaw !== 'Não se aplica' && qtdPortaRaw !== '0 portas' && qtdPortaRaw !== 0 && qtdPortaRaw !== '0') {
    temQtdPortas = true;
  }

  // Verifica termos no texto
  const hasCorrer = /porta[s]?\s+de\s+correr|correr\b/.test(text) && !/corredi[çc]a/.test(text) ? /porta[s]?\s+de\s+correr/.test(text) || (text.includes('correr') && text.includes('porta')) : /porta[s]?\s+de\s+correr/.test(text);
  
  // Detecção mais refinada de menção a portas
  // Expressões que indicam presença de porta:
  // "porta", "portas", "1 porta", "2 portas", etc.
  const hasPortaWord = /\bportas?\b/.test(text);
  
  // Casos negativos explícitos: "sem porta", "sem portas", "0 porta", "0 portas"
  const explicitlyNoDoors = /sem\s+portas?|não\s+possui\s+portas?|0\s+portas?/.test(text) || qtdPortaRaw === '0 portas' || qtdPortaRaw === 0;

  if (explicitlyNoDoors && !temQtdPortas) {
    return null; // Não tem portas!
  }

  if (!hasPortaWord && !temQtdPortas) {
    return null; // Não menciona porta e não tem quantidade de portas
  }

  // Identificação dos tipos específicos
  const mentionsCorrer = /porta[s]?\s+(?:de\s+)?correr\b/.test(text) || /\bcorrer\b/.test(text) && hasPortaWord;
  const mentionsBasculante = /basculante\b/.test(text) || /pist[aã]o\s+(?:a\s+)?g[aá]s/.test(text);
  const mentionsBater = /porta[s]?\s+(?:de\s+)?(?:bater|abrir)\b/.test(text) || /\b(?:bater|abrir)\b/.test(text) && hasPortaWord;

  // Combinações
  if (mentionsBater && mentionsCorrer && mentionsBasculante) {
    return 'Bater + Correr + Basculante';
  }
  if (mentionsBater && mentionsCorrer) {
    return 'Bater + Correr';
  }
  if (mentionsBater && mentionsBasculante) {
    return 'Bater + Basculante';
  }
  if (mentionsCorrer && mentionsBasculante) {
    return 'Correr + Basculante';
  }

  if (mentionsCorrer) {
    return 'Correr';
  }

  if (mentionsBasculante) {
    return 'Basculante';
  }

  if (mentionsBater) {
    return 'Bater';
  }

  // Se tem porta (menção ou quantidade > 0) e não é correr nem basculante -> padrão do mercado/usuário: Bater
  if (temQtdPortas || hasPortaWord) {
    // Atenção para falsos positivos comuns com a palavra "porta":
    // "porta copos", "porta toalhas", "porta condimentos", "porta retrato", "porta talher", "porta pano", "porta tempero", "porta objetos"
    const isFalseDoor = /porta[\s-](?:copos?|toalhas?|condimentos?|retratos?|talheres?|panos?|temperos?|objetos?|garrafas?|latas?|shampoo)/.test(text);
    const hasRealDoorMention = /com\s+\d+\s+portas?|\d+\s+portas?|portas?\s+em|portas?\s+com|portas?\s+de|puxador|dobradi[çc]a/.test(text);

    if (isFalseDoor && !temQtdPortas && !hasRealDoorMention) {
      return null;
    }

    return 'Bater';
  }

  return null;
}

async function inspect() {
  let all = [], from = 0;
  while (true) {
    const { data } = await supabase.from('products')
      .select('id, name, description, technical_specs')
      .is('deleted_at', null)
      .range(from, from + 199);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 200) break;
    from += 200;
  }

  const results = {
    'Bater': [],
    'Correr': [],
    'Basculante': [],
    'Bater + Correr': [],
    'Bater + Basculante': [],
    'Correr + Basculante': [],
    'Bater + Correr + Basculante': [],
    'Sem Porta': []
  };

  for (const p of all) {
    const type = determineDoorType(p);
    if (type) {
      results[type].push(p);
    } else {
      results['Sem Porta'].push(p);
    }
  }

  console.log('=== RESUMO DA CLASSIFICAÇÃO ===');
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k}: ${v.length} produtos`);
  }

  console.log('\n--- AMOSTRA CORRER ---');
  results['Correr'].slice(0, 5).forEach(p => console.log(`- ${p.name}`));

  console.log('\n--- AMOSTRA BASCULANTE ---');
  results['Basculante'].slice(0, 5).forEach(p => console.log(`- ${p.name}`));

  console.log('\n--- AMOSTRA COMBINAÇÕES ---');
  ['Bater + Correr', 'Bater + Basculante', 'Correr + Basculante'].forEach(k => {
    console.log(`[${k}]:`);
    results[k].slice(0, 5).forEach(p => console.log(`  - ${p.name}`));
  });

  console.log('\n--- AMOSTRA SEM PORTA ---');
  results['Sem Porta'].slice(0, 10).forEach(p => console.log(`- ${p.name}`));
}

inspect();
