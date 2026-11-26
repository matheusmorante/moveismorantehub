import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: 'Cozinhas Moduladas e Compactas' })
    .eq('id', 'b3a1a235-fd4c-4706-a058-6f8200b3731a')
    .select();
    
  if (error) {
    console.error('Error updating category:', error);
  } else {
    console.log('Category updated successfully:', data);
  }
}

run();
