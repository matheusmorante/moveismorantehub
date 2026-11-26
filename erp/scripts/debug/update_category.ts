import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from the erp root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .ilike('name', '%cozinha%');
  
  if (error) {
    console.error('Error fetching categories:', error);
    return;
  }
  
  console.log('Found categories:', categories.map((c: any) => c.name));
  
  const target = categories.find((c: any) => c.name.toLowerCase().includes('jogo de cozinha') || c.name.toLowerCase().includes('cozinha modulada') || c.name.toLowerCase().includes('jogos de cozinha') || c.name.toLowerCase().includes('cozinhas compactas'));
  
  if (target) {
    console.log(`Renaming category ID ${target.id} from "${target.name}" to "Cozinhas Moduladas e Compactas"`);
    
    const { error: updateError } = await supabase
      .from('categories')
      .update({ name: 'Cozinhas Moduladas e Compactas' })
      .eq('id', target.id);
      
    if (updateError) {
      console.error('Error updating category:', updateError);
    } else {
      console.log('Category renamed successfully.');
    }
  } else {
    console.log('Target category not found.');
  }
}

run();
