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

async function run() {
  console.log('--- Verificando SQL ou colunas ---');
  // Se houver rpc para sql
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      ALTER TABLE financial_transactions 
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS origin VARCHAR(30) DEFAULT 'MANUAL',
      ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
      ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'BUSINESS',
      ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS due_date DATE,
      ADD COLUMN IF NOT EXISTS due_day INT,
      ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS installments_total INT;
    `
  });

  if (error) {
    console.log('RPC exec_sql indisponível (esperado). Mensagem:', error.message);
  } else {
    console.log('✅ Executado via RPC!');
  }
}

run();
