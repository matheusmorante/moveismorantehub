import { createClient } from '@supabase/supabase-js';

const ERP_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const ERP_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

async function run() {
  console.log('Consultando OpenAPI do Supabase para obter o esquema de "products"...');
  
  try {
    const response = await fetch(`${ERP_URL}/rest/v1/`, {
      headers: {
        'apikey': ERP_KEY,
        'Authorization': `Bearer ${ERP_KEY}`
      }
    });
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const spec = await response.json();
    const productProps = spec.definitions?.products?.properties;
    
    if (productProps) {
      console.log('\n--- COLUNAS DA TABELA products NO BANCO DO ERP ---');
      Object.keys(productProps).forEach(col => {
        const prop = productProps[col];
        console.log(`- ${col}: ${prop.type} ${prop.format ? '(' + prop.format + ')' : ''} ${prop.description ? '- ' + prop.description : ''}`);
      });
    } else {
      console.log('Não foi possível encontrar a definição da tabela "products". Definitions:', Object.keys(spec.definitions || {}));
    }
  } catch (error) {
    console.error('Falha ao inspecionar colunas:', error.message);
  }
  
  process.exit(0);
}

run();
