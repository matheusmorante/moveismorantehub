import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkSpecialDoors() {
  let all = [], from = 0;
  while (true) {
    const { data } = await supabase.from('products').select('id, name, description, technical_specs').is('deleted_at', null).range(from, from + 199);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 200) break;
    from += 200;
  }
  
  const correrKeywords = ['correr', 'deslizante', 'trilho'];
  const basculanteKeywords = ['basculante', 'pistão', 'pistao'];
  
  const achados = [];
  all.forEach(p => {
    const text = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
    const hasCorrer = correrKeywords.some(k => text.includes(k));
    const hasBasc = basculanteKeywords.some(k => text.includes(k));
    if (hasCorrer || hasBasc) {
      achados.push({ name: p.name, desc: p.description?.replace(/\n/g, ' ').slice(0, 100), hasCorrer, hasBasc });
    }
  });
  console.log('Total com correr ou basculante:', achados.length);
  achados.forEach(a => console.log(`- [Correr:${a.hasCorrer} | Basc:${a.hasBasc}] ${a.name} | ${a.desc}`));
}

checkSpecialDoors();
