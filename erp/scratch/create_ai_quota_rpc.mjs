import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuotaFunction() {
  console.log('Verificando suporte a função de reserva atômica de IA...');
  const { data, error } = await supabase.from('api_usage_logs').select('*').limit(1);
  if (error) {
    console.error('Erro de conexão:', error);
  } else {
    console.log('Conexão Supabase OK.');
  }
}

testQuotaFunction();
