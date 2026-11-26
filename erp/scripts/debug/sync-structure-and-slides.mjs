import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function hasDrawer(product) {
  const specs = product.technical_specs?.technicalValues || {};
  const qtdGavetas = specs['Quantidade de gavetas'] || specs['Quantidade de Gavetas'];
  
  if (qtdGavetas && qtdGavetas !== '0 gavetas' && qtdGavetas !== '0' && qtdGavetas !== 0 && qtdGavetas !== 'Não se aplica') {
    return true;
  }

  const name = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const text = `${name} ${desc}`;

  const explicitGaveta = /\b\d+\s*g(?:avetas?)?\b|\bgavetas?\b/.test(name) ||
                         /\b\d+\s+gavetas?\b/.test(desc) ||
                         /\bgavetas?\s+com\b/.test(desc) ||
                         /\bgaveta\b/.test(desc);

  const explicitlyNoGaveta = /sem\s+gavetas?|não\s+possui\s+gavetas?|0\s+gavetas?/.test(text) || qtdGavetas === '0 gavetas' || qtdGavetas === 0;

  return explicitGaveta && !explicitlyNoGaveta;
}

function detectSlideSystem(product) {
  if (!hasDrawer(product)) return null;

  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();

  const isTelescopic = /telesc[oó]pica[s]?\b/.test(text);
  const isMetalica = /corredi[çc]a[s]?\s+met[aá]lica[s]?\b|corredi[çc]a[s]?\s+de\s+metal\b/.test(text) ||
                     (/corredi[çc]a[s]?\b/.test(text) && /met[aá]lica[s]?|metal\b/.test(text));

  if (isTelescopic) return 'Corrediça telescópica';
  if (isMetalica) return 'Corrediça metálica simples';

  return null;
}

function shouldFixStructure(product) {
  const specs = product.technical_specs?.technicalValues || {};
  const est = specs['Estrutura'];
  if (!est || !est.includes('Metal')) return null;

  const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();

  // Metal real na estrutura (base de ferro, pés de ferro, móvel industrial com metal, etc)
  const isRealMetalStructure = /p[eé]s?\s+(?:de\s+)?(?:ferro|metal|a[cç]o)|base\s+(?:de\s+)?(?:ferro|metal|a[cç]o)|estrutura\s+(?:em\s+|de\s+)?(?:ferro|metal|a[cç]o)|industrial\b|tubular\b/i.test(text);

  if (!isRealMetalStructure) {
    if (est === 'MDP/Metal') return 'MDP';
    if (est === 'MDF/Metal') return 'MDF';
  }

  return null;
}

async function execute() {
  console.log('Iniciando sincronização de Estrutura e Sistema de Deslizamento...');
  let all = [], from = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, name, description, technical_specs').is('deleted_at', null).range(from, from + 199);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 200) break;
    from += 200;
  }

  let countEst = 0;
  let countSlide = 0;

  for (const p of all) {
    const specs = { ...(p.technical_specs || {}) };
    const currentValues = { ...(specs.technicalValues || {}) };
    let changed = false;

    // 1. Correção de Estrutura
    const newEst = shouldFixStructure(p);
    if (newEst && currentValues['Estrutura'] !== newEst) {
      currentValues['Estrutura'] = newEst;
      changed = true;
      countEst++;
    }

    // 2. Sistema de deslizamento
    const slide = detectSlideSystem(p);
    if (slide && currentValues['Sistema de deslizamento da gaveta'] !== slide) {
      currentValues['Sistema de deslizamento da gaveta'] = slide;
      changed = true;
      countSlide++;
    }

    if (changed) {
      specs.technicalValues = currentValues;
      const { error } = await supabase.from('products').update({ technical_specs: specs }).eq('id', p.id);
      if (error) {
        console.error(`Erro em ${p.name}:`, error.message);
      }
    }
  }

  console.log(`\nConcluído com sucesso!`);
  console.log(`- Estruturas corrigidas (removido /Metal indevido): ${countEst}`);
  console.log(`- Sistemas de deslizamento preenchidos: ${countSlide}`);
}

execute();
