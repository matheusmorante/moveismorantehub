import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from apps/erp/.env
dotenv.config({ path: path.join(__dirname, 'apps/erp/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL() {
  console.log('--- RESTAURANDO CRIADO MUDO AROMA ---');
  
  // First, find the product
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, description, is_draft, deleted')
    .ilike('description', '%Criado Mudo Aroma%');

  if (fetchError) {
    console.error('Erro ao buscar produto:', fetchError);
    return;
  }

  if (!products || products.length === 0) {
    console.log('Produto "Criado Mudo Aroma" não encontrado.');
    
    // Tentando busca mais genérica
    const { data: others } = await supabase.from('products').select('description').limit(5);
    console.log('Sugestões de produtos encontrados:', others?.map(p => p.description));
    return;
  }

  const target = products[0];
  console.log(`Encontrado: "${target.description}" (ID: ${target.id}) | Draft: ${target.is_draft} | Deleted: ${target.deleted}`);

  // Perform the "SQL" Update (via REST API)
  const { data, error } = await supabase
    .from('products')
    .update({ 
      is_draft: false, 
      deleted: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', target.id)
    .select();

  if (error) {
    console.error('Erro ao atualizar:', error);
  } else {
    console.log('SUCESSO: Produto restaurado e rascunho preenchido!');
    console.log('Dados atualizados:', data[0].description);
  }
}

runSQL();
