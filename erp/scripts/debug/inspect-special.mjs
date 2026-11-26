import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectSpecial() {
  const nomes = [
    'Conjunto de Banheiro Veneza',
    'Treliche Infantil Jade com Escada',
    'Base Box Baú Casal Preto JSW QUEIMA DOS SALVADOS',
    'Cozinha Modulada Divina MGM 2,70m Pecas',
    'Cozinha Modulada Florença 6 Peças 100% MDF',
    'Estante Ripado Home para TV Nt1335 até 65 Polegadas 2 Portas',
    'Mesa Para Escritório Escrivaninha Hall A02 Ipê Preto',
    'Rack Bancada 1.36 Graci para Tv até 50 Pol com Rodízios',
    'Guarda Roupa Bragança 100% MDF com Espelho'
  ];
  for (const n of nomes) {
    const { data } = await supabase.from('products').select('name, description, technical_specs').ilike('name', '%' + n + '%').limit(1);
    if (data && data[0]) {
      console.log('----------------------------------------------------');
      console.log('PRODUTO:', data[0].name);
      console.log('QTD PORTAS:', data[0].technical_specs?.technicalValues?.['Quantidade de portas']);
      console.log('DESC:', data[0].description?.replace(/\n\s*\n/g, '\n').slice(0, 300));
    }
  }
}

inspectSpecial();
