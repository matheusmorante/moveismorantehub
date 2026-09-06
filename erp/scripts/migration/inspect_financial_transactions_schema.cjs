const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDQ5ODIsImV4cCI6MjA1NzYyMDk4Mn0.gq_v-H3aR-O8n4QGvqFp3_Q6N37Q8V3eR1zL1G1G1g1';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('--- Inspecionando colunas da tabela financial_transactions ---');
  const { data, error } = await supabase.from('financial_transactions').select('*').limit(1);
  if (error) {
    console.error('Erro ao consultar financial_transactions:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Campos existentes:', Object.keys(data[0]));
  } else {
    console.log('Tabela vazia ou sem registros.');
    // Tentar insert com rollback ou metadata se possível
  }
}

inspectSchema();
