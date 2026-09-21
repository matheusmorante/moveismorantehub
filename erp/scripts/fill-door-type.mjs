import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function classifyProductDoor(product) {
  const name = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const text = `${name} ${desc}`;
  const specs = product.technical_specs?.technicalValues || {};

  // 1. Quantidade de portas cadastrada nas especificações
  const qtdPortasRaw = specs['Quantidade de portas'] || specs['Quantidade de Portas'];
  let temQtdPortas = false;
  if (qtdPortasRaw && qtdPortasRaw !== 'Não se aplica' && qtdPortasRaw !== '0 portas' && qtdPortasRaw !== 0 && qtdPortasRaw !== '0') {
    temQtdPortas = true;
  }

  // 2. Detecção de menção a portas no texto
  // Casos negativos explícitos
  const explicitlyNoDoors = /sem\s+portas?|não\s+possui\s+portas?|0\s+portas?/.test(text) || qtdPortasRaw === '0 portas' || qtdPortasRaw === 0;
  if (explicitlyNoDoors && !temQtdPortas) {
    return null;
  }

  // Menção genérica ou numérica a portas de móveis
  const hasDoorMention = /\b\d+\s+portas?\b/.test(text) ||
    /\bportas?\s+em\b/.test(text) ||
    /\bportas?\s+com\b/.test(text) ||
    /\bportas?\s+de\b/.test(text) ||
    /\bporta\s+basculante\b/.test(text) ||
    /\bporta\s+ripada\b/.test(text) ||
    /\bportas\b/.test(text) ||
    /\bporta\b/.test(name) ||
    (/\bporta\b/.test(text) && !/porta[\s-](?:copos?|toalhas?|condimentos?|retratos?|talheres?|panos?|temperos?|objetos?|garrafas?|latas?|shampoo)/.test(text));

  // Menção a dobradiças metálicas / dobradiça (comum em balcões e paneleiros)
  const hasDobradica = /\bdobradi[çc]as?\b/.test(text);

  const productHasDoors = temQtdPortas || hasDoorMention || (hasDobradica && /arm[aá]rio|balc[aã]o|paneleiro|cozinha|guarda[\s-]roupa|gabinete/.test(text));

  if (!productHasDoors) {
    return null;
  }

  // 3. Detecção de Tipos Específicos
  // Correr: "porta de correr", "portas de correr", ou "roldana" + "trilho"
  const isCorrer = /porta[s]?\s+de\s+correr\b/.test(text) || 
                   (/roldana/.test(text) && /trilho/.test(text)) ||
                   (/\bcorrer\b/.test(name) && /porta/.test(text));

  // Basculante: "basculante", "pistão a gás", "pistao a gas", "pistão"
  const isBasculante = /basculante\b/.test(text) || /pist[aã]o\s+(?:a\s+)?g[aá]s\b/.test(text);

  // Bater / Abrir:
  // "porta de bater", "porta de abrir", ou se tiver portas normais (dobradiça comum)
  const explicitBater = /porta[s]?\s+(?:de\s+)?(?:bater|abrir)\b/.test(text);

  // Para cozinhas completas / kits com múltiplos módulos:
  // Exemplo: se tem módulos aéreos com basculante e balcões com portas comuns/bater
  const hasMultipleModules = /cozinha\s+(?:modulada|completa)|conjunto|kit/i.test(text) || /\b\d+\s+pe[çc]as\b/i.test(text);

  // Combinações
  if (isCorrer && isBasculante && (explicitBater || hasMultipleModules)) {
    return 'Bater + Correr + Basculante';
  }
  if (isCorrer && explicitBater) {
    return 'Bater + Correr';
  }
  if (isCorrer && isBasculante) {
    return 'Correr + Basculante';
  }
  if (isBasculante && (explicitBater || hasMultipleModules)) {
    return 'Bater + Basculante';
  }

  if (isCorrer) {
    return 'Correr';
  }

  if (isBasculante) {
    return 'Basculante';
  }

  // Se tem portas e não é correr nem basculante -> padrão Bater
  return 'Bater';
}

async function run() {
  const DRY_RUN = !process.argv.includes('--apply');
  console.log(`=== CLASSIFICAÇÃO E ATUALIZAÇÃO DE TIPO DE PORTA [${DRY_RUN ? 'SIMULAÇÃO (DRY-RUN)' : 'APLICANDO EM PRODUÇÃO'}] ===\n`);

  let all = [], from = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, name, description, technical_specs').is('deleted_at', null).range(from, from + 199);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 200) break;
    from += 200;
  }

  console.log(`Total de produtos avaliados: ${all.length}\n`);

  const stats = {
    'Bater': [],
    'Correr': [],
    'Basculante': [],
    'Bater + Correr': [],
    'Bater + Basculante': [],
    'Correr + Basculante': [],
    'Bater + Correr + Basculante': [],
    'Sem Porta': []
  };

  let toUpdate = 0;
  let alreadySet = 0;

  for (const p of all) {
    const doorType = classifyProductDoor(p);
    const currentDoorType = p.technical_specs?.technicalValues?.['Tipo de Porta'];

    if (doorType) {
      stats[doorType].push(p);
      if (currentDoorType === doorType) {
        alreadySet++;
      } else {
        toUpdate++;
      }
    } else {
      stats['Sem Porta'].push(p);
      if (currentDoorType && currentDoorType !== 'Não se aplica') {
        // Se tinha tipo de porta mas não tem porta, precisamos limpar/remover
        toUpdate++;
      }
    }
  }

  console.log('--- ESTATÍSTICAS DETALHADAS ---');
  for (const [type, prods] of Object.entries(stats)) {
    console.log(`- ${type.padEnd(28)}: ${String(prods.length).padStart(3)} produtos`);
  }

  console.log(`\nProdutos que já estavam corretos: ${alreadySet}`);
  console.log(`Produtos a atualizar: ${toUpdate}`);

  if (DRY_RUN) {
    console.log('\n[AVISO] Para aplicar as alterações no Supabase, execute com --apply.');
    return;
  }

  console.log('\n--- ATUALIZANDO NO BANCO DE DADOS ---');
  let count = 0;
  for (const p of all) {
    const doorType = classifyProductDoor(p);
    const specs = { ...(p.technical_specs || {}) };
    const currentValues = { ...(specs.technicalValues || {}) };
    const currentDoorType = currentValues['Tipo de Porta'];

    let needsUpdate = false;
    if (doorType) {
      if (currentDoorType !== doorType) {
        currentValues['Tipo de Porta'] = doorType;
        needsUpdate = true;
      }
    } else {
      // Sem porta: se houver valor anterior diferente de 'Não se aplica' ou vazio, limpamos
      if (currentDoorType && currentDoorType !== 'Não se aplica') {
        delete currentValues['Tipo de Porta'];
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      specs.technicalValues = currentValues;
      const { error } = await supabase.from('products').update({ technical_specs: specs }).eq('id', p.id);
      if (error) {
        console.error(`Erro ao atualizar ${p.name}:`, error.message);
      } else {
        count++;
        process.stdout.write(`Atualizados ${count}/${toUpdate}...\r`);
      }
    }
  }

  console.log(`\n\nFinalizado com sucesso! ${count} produtos atualizados.`);
}

run();
