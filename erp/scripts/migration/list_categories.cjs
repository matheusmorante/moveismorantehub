const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI'; // ANON KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

async function run() {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('name')
      .order('name', { ascending: true });

    if (error) {
      // Se der erro na tabela 'categories', tentamos na tabela 'product_categories'
      console.log('Tabela categories não encontrada ou erro, tentando outra...');
      throw error;
    }

    const names = categories.map(c => c.name).filter(Boolean);
    console.log('CATEGORIAS_LIST:' + names.join(', '));
  } catch (error) {
    try {
      // Outra tentativa
      const { data: categories, error: error2 } = await supabase
        .from('product_categories')
        .select('name')
        .order('name', { ascending: true });
      if (error2) throw error2;
      const names = categories.map(c => c.name).filter(Boolean);
      console.log('CATEGORIAS_LIST:' + names.join(', '));
    } catch (e) {
      console.error('Erro ao buscar categorias:', e.message);
    }
  }
}

run();
