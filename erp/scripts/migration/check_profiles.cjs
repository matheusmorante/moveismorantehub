const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  console.log('Buscando pg_policies...');
  // Nota: o PostgREST expoe apenas tabelas no schema public por padrao.
  // Vamos tentar ver se ha alguma view ou RPC.
  // Se nao, podemos testar se conseguimos fazer login com algum usuario padrao.
  // Vamos buscar na tabela 'profiles' ou 'vendedores' ou 'users'
  const { data, error } = await supabase.from('profiles').select('*');
  console.log('Profiles data:', data, 'Error:', error);
}

run();
