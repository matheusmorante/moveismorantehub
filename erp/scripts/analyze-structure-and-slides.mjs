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

  // Termos explícitos de gavetas
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

async function analyze() {
  let all = [], from = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, name, description, technical_specs').is('deleted_at', null).range(from, from + 199);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 200) break;
    from += 200;
  }

  const structureFixes = [];
  const slideFixes = [];

  for (const p of all) {
    const newEst = shouldFixStructure(p);
    if (newEst) {
      structureFixes.push({ id: p.id, name: p.name, oldEst: p.technical_specs?.technicalValues?.['Estrutura'], newEst });
    }

    const slide = detectSlideSystem(p);
    const currentSlide = p.technical_specs?.technicalValues?.['Sistema de deslizamento da gaveta'];
    if (slide && currentSlide !== slide) {
      slideFixes.push({ id: p.id, name: p.name, oldSlide: currentSlide, newSlide: slide });
    }
  }

  console.log('=== RESULTADOS DA ANÁLISE ===');
  console.log(`1. Correções de Estrutura (MDF/Metal ou MDP/Metal indevidos por causa de corrediça/puxador/dobradiça): ${structureFixes.length}`);
  structureFixes.forEach(f => console.log(`   [${f.oldEst} -> ${f.newEst}] ${f.name}`));

  console.log(`\n2. Atribuição de Sistema de Deslizamento da Gaveta: ${slideFixes.length}`);
  const porTipo = {};
  slideFixes.forEach(s => {
    porTipo[s.newSlide] = (porTipo[s.newSlide] || 0) + 1;
  });
  console.log('Distribuição:', porTipo);
  console.log('\nAmostra Telescópicas:');
  slideFixes.filter(s => s.newSlide === 'Corrediça telescópica').slice(0, 5).forEach(s => console.log(`   - ${s.name}`));
  console.log('\nAmostra Metálicas Simples:');
  slideFixes.filter(s => s.newSlide === 'Corrediça metálica simples').slice(0, 5).forEach(s => console.log(`   - ${s.name}`));
}

analyze();
