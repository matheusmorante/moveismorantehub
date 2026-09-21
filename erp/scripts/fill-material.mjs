#!/usr/bin/env node
/**
 * Classifica e preenche o campo Material em technicalValues dos produtos pai.
 *
 * Uso:
 *   node scripts/fill-material.mjs                         → aplica direto
 *   node scripts/fill-material.mjs --dry-run               → só imprime, não salva
 *   node scripts/fill-material.mjs --only-unmerged         → ignora produtos cujas variações foram mescladas
 *
 * Configure MORANTE_SUPABASE_URL, MORANTE_SUPABASE_ANON_KEY e GEMINI_API_KEY
 * no ambiente antes da execução. Nenhuma credencial deve ser gravada neste arquivo.
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const requireEnv = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configure a variável de ambiente ${name} antes de executar.`);
  return value;
};

const SUPABASE_URL = requireEnv('MORANTE_SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('MORANTE_SUPABASE_ANON_KEY');
const GEMINI_API_KEY = requireEnv('GEMINI_API_KEY');

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_UNMERGED = process.argv.includes('--only-unmerged');
const BATCH_DELAY_MS = 300;
const GEMINI_BATCH = 8;

const VALID_MATERIALS = [
  'Aco Carbono','Inox','Madeira Macica','Madeira Macica/Metal',
  'Madeira Macica/Vidro','MDF','MDF/Inox','MDF/Madeira Macica',
  'MDF/MDP','MDF/MDP/Vidro','MDF/Metal','MDF/Vidro','MDP',
  'MDP/Inox','MDP/Madeira Macica','MDP/Metal','MDP/Vidro',
  'Metal','Metal/Vidro','Vidro'
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const chunk = (arr, n) => { const out=[]; for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out; };

async function fetchProducts() {
  let all = [];
  let from = 0;
  const PAGE = 200;
  while(true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, active, status, deleted, technical_specs, product_variations(id, merged_to_variation_id)')
      .is('deleted_at', null)
      .neq('status', 'trash')
      .range(from, from + PAGE - 1)
      .order('name');
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const registered = all.filter(p => p.active === true || p.active === false);
  const eligible = ONLY_UNMERGED
    ? registered.filter(p => !(p.product_variations || []).some(v => v.merged_to_variation_id))
    : registered;

  console.log(`${eligible.length} produtos elegíveis${ONLY_UNMERGED ? ' (não mesclados)' : ''}.`);
  return eligible.filter(p => {
    const mat = p.technical_specs?.technicalValues?.['Material'];
    return !mat || String(mat).trim() === '';
  });
}

async function classifyBatch(products) {
  const listStr = VALID_MATERIALS.join(', ');
  const productList = products.map((p, i) =>
    `[${i+1}] Nome: "${p.name||''}" | Desc: "${(p.description||'').slice(0,300)}"`
  ).join('\n');

  const prompt = `Classifique o material principal de cada produto de mobiliario abaixo.
Use SOMENTE valores desta lista: ${listStr}
Se nao encontrar o material EXPLICITAMENTE no nome ou descricao, responda null.
Retorne JSON array: [{"i":1,"m":"valor ou null"}, ...]
Nenhum texto fora do JSON.

${productList}`;

  const resp = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { temperature: 0, responseMimeType: 'application/json' }
  });

  const txt = resp.text?.trim() || '[]';
  try {
    const m = txt.match(/\[[\s\S]*\]/);
    return JSON.parse(m ? m[0] : txt);
  } catch {
    console.warn('Parse fail:', txt.slice(0,100));
    return products.map((_,i) => ({ i: i+1, m: null }));
  }
}

async function main() {
  console.log(`\nfill-material.mjs [${DRY_RUN?'DRY-RUN':'PRODUCAO'}${ONLY_UNMERGED ? ' | NAO MESCLADOS' : ''}]\n`);
  const products = await fetchProducts();
  console.log(`${products.length} produtos sem Material.\n`);
  if (!products.length) { console.log('Nada a fazer.'); return; }

  const classified = [];
  const notFound = [];

  const batches = chunk(products, GEMINI_BATCH);
  let done = 0;
  for (const batch of batches) {
    const res = await classifyBatch(batch);
    for (let i = 0; i < batch.length; i++) {
      const p = batch[i];
      const c = res.find(r => r.i === i+1);
      const mat = c?.m;
      if (mat && VALID_MATERIALS.includes(mat)) {
        classified.push({ ...p, material: mat });
      } else {
        notFound.push(p);
      }
    }
    done += batch.length;
    process.stdout.write(`  Processando ${done}/${products.length}...\r`);
    await sleep(BATCH_DELAY_MS);
  }
  console.log('');

  console.log('\n=== CLASSIFICADOS (' + classified.length + ') ===');
  classified.forEach(r => console.log(`  [${r.material}] ${r.name}`));

  console.log('\n=== SEM MATERIAL - VOCE DECIDE (' + notFound.length + ') ===');
  notFound.forEach(r => console.log(`  [???] ${r.id} | ${r.name}`));

  if (DRY_RUN) { console.log('\nDRY-RUN: sem alteracoes.'); return; }

  console.log('\nSalvando no banco...');
  let saved = 0;
  for (const item of classified) {
    const existingSpecs = item.technical_specs || {};
    const newSpecs = {
      ...existingSpecs,
      technicalValues: { ...(existingSpecs.technicalValues||{}), Material: item.material }
    };
    const { error } = await supabase.from('products').update({ technical_specs: newSpecs }).eq('id', item.id);
    if (error) { console.error('ERRO', item.name, error.message); continue; }
    saved++;
    process.stdout.write(`  Salvando ${saved}/${classified.length}\r`);
    await sleep(30);
  }
  console.log(`\nPronto! Salvos: ${saved} | Sem material: ${notFound.length}`);
  if (notFound.length) console.log('Avise quais materiais colocar nos produtos SEM MATERIAL acima.');
}

main().catch(e => { console.error(e); process.exit(1); });
