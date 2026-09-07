import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testProfilesCols() {
  const { data, error } = await s.rpc('get_table_columns', { table_name: 'profiles' });
  console.log('rpc get_table_columns:', { error, data });

  // Tentativa direta com colunas comuns:
  const candidates = ['id', 'email', 'full_name', 'role', 'username', 'avatar_url', 'created_at', 'updated_at'];
  for (const col of candidates) {
    const { error: err } = await s.from('profiles').select(col).limit(1);
    console.log(`Coluna profiles.${col}:`, err ? `NÃO EXISTE (${err.message})` : 'EXISTE');
  }
}

testProfilesCols();
