const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase do cliente
const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDQ5ODIsImV4cCI6MjA1NzYyMDk4Mn0.gq_v-H3aR-O8n4QGvqFp3_Q6N37Q8V3eR1zL1G1G1g1'; // Anon key mock/obtida ou do env

// Vamos ler o .env.local para pegar as chaves reais
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../../../.env.local');
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

const url = process.env.VITE_SUPABASE_URL || supabaseUrl;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testando conexão com o Supabase...');
console.log('URL:', url);

const supabase = createClient(url, key);

async function testQuery() {
    const { data, error } = await supabase
        .from('products')
        .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('ERRO NA QUERY:', error);
    } else {
        console.log('SUCESSO! Linhas retornadas:', data?.length);
        console.log('Primeiro produto:', JSON.stringify(data?.[0], null, 2));
    }
}

testQuery().catch(console.error);
