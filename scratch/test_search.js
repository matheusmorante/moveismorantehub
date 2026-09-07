import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

function cleanQuery(raw) {
  let q = raw.trim();
  // Se for URL, extrai o último segmento
  if (q.includes('/')) {
    const parts = q.split('/').filter(Boolean);
    q = parts[parts.length - 1].split('?')[0];
  }
  return q;
}

async function smartSearch(rawQuery) {
  const q = cleanQuery(rawQuery);
  console.log('Query limpa:', q);

  // 1. Tenta por ID exato se parecer UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) {
    const { data } = await s.from('products').select('id, name, slug, code').eq('id', q);
    if (data && data.length) return data;
  }

  // 2. Tenta por slug exato ou código
  const { data: slugOrCode } = await s
    .from('products')
    .select('id, name, slug, code')
    .or(`slug.eq.${q},code.eq.${q}`)
    .limit(5);

  if (slugOrCode && slugOrCode.length) return slugOrCode;

  // 3. Quebra em palavras significativas (ignorando hífens e pontuações)
  const words = q
    .replace(/[^\w\s\u00C0-\u00FF]/gi, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2);

  console.log('Palavras:', words);

  if (words.length === 0) return [];

  // Monta busca onde todas as palavras principais estão presentes (usando o termo mais forte, ex: "Monza")
  // Ou busca com ilike na palavra mais específica
  let queryBuilder = s.from('products').select('id, name, slug, code').is('deleted_at', null).eq('deleted', false);

  for (const word of words) {
    queryBuilder = queryBuilder.or(`name.ilike.%${word}%,slug.ilike.%${word}%`);
  }

  const { data } = await queryBuilder.limit(10);
  return data || [];
}

async function run() {
  console.log('1. Busca com hífen:');
  console.log(await smartSearch('Guarda-Roupa Monza'));

  console.log('2. Busca com URL:');
  console.log(await smartSearch('https://catalogo.moveismorante.com.br/produto/guarda-roupa-monza-4-portas-c-pes'));

  console.log('3. Busca por código:');
  console.log(await smartSearch('000239'));
}

run();
