import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSlidesAndFixMetal() {
  let all = [], from = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, name, description, technical_specs').is('deleted_at', null).range(from, from + 199);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 200) break;
    from += 200;
  }

  console.log(`Total de produtos lidos: ${all.length}`);

  // 1. Verificar Estrutura com Metal
  console.log('\n--- 1. ANÁLISE DE PRODUTOS COM "METAL" NA ESTRUTURA ---');
  const trulyMetalItems = ['ferro', 'industrial', 'aço', 'aco', 'tubular'];
  const fixedStructure = [];

  for (const p of all) {
    const specs = p.technical_specs?.technicalValues || {};
    const est = specs['Estrutura'];
    if (est && est.includes('Metal')) {
      const text = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
      
      // Checar se a estrutura do móvel realmente tem metal (ex: pés de ferro, base de metal, mesa industrial)
      const hasRealMetalStructure = /p[eé]s?\s+(?:de\s+)?(?:ferro|metal|a[cç]o)|base\s+(?:de\s+)?(?:ferro|metal|a[cç]o)|estrutura\s+(?:em\s+|de\s+)?(?:ferro|metal|a[cç]o)|tubular|industrial/i.test(text);

      let newEst = est;
      if (!hasRealMetalStructure) {
        if (est === 'MDP/Metal') newEst = 'MDP';
        else if (est === 'MDF/Metal') newEst = 'MDF';
      }

      console.log(`[${est} -> ${newEst}] ${p.name} | RealMetalStructure: ${hasRealMetalStructure}`);
      if (newEst !== est) {
        fixedStructure.push({ id: p.id, name: p.name, oldEst: est, newEst });
      }
    }
  }

  // 2. Verificar Sistema de Deslizamento de Gavetas
  console.log('\n--- 2. ANÁLISE DE SISTEMA DE DESLIZAMENTO DA GAVETA ---');
  const telescopicKeywords = ['telescópica', 'telescopica', 'telescópicas', 'telescopicas'];
  const metalicaKeywords = ['metálica', 'metalica', 'metálicas', 'metalicas', 'corrediça de metal', 'corrediças de metal', 'corredica de metal', 'corredicas de metal'];

  const slideUpdates = [];

  for (const p of all) {
    const text = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
    const specs = p.technical_specs?.technicalValues || {};
    const currentSlide = specs['Sistema de deslizamento da gaveta'];
    
    // Verifica se tem gaveta
    const qtdGavetasRaw = specs['Quantidade de gavetas'];
    const hasGavetas = (qtdGavetasRaw && qtdGavetasRaw !== '0 gavetas' && qtdGavetasRaw !== 'Não se aplica') || /gaveta|gavetas/.test(text);

    let detectedSlide = null;
    if (telescopicKeywords.some(k => text.includes(k))) {
      detectedSlide = 'Corrediça telescópica';
    } else if (metalicaKeywords.some(k => text.includes(k))) {
      detectedSlide = 'Corrediça metálica simples';
    }

    if (detectedSlide && currentSlide !== detectedSlide) {
      slideUpdates.push({ id: p.id, name: p.name, oldVal: currentSlide, newVal: detectedSlide });
    }
  }

  console.log(`Produtos com estrutura corrigida: ${fixedStructure.length}`);
  console.log(`Produtos com sistema de deslizamento a preencher: ${slideUpdates.length}`);

  slideUpdates.slice(0, 10).forEach(u => console.log(`  [${u.newVal}] ${u.name}`));
}

checkSlidesAndFixMetal();
