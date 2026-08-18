const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Buscando oportunidades...");
  const { data: opportunities, error } = await supabase
    .from('opportunities')
    .select('*');

  if (error) {
    console.error("Erro:", error);
    return;
  }

  console.log(`Total de oportunidades: ${opportunities.length}`);
  console.log(JSON.stringify(opportunities, null, 2));
}

run();
