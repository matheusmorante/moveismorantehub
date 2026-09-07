import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log('--- Verificando financial_transactions ---');
  const { data: tx, error: txErr } = await s.from('financial_transactions').select('*').limit(1);
  if (txErr) console.error('financial_transactions error:', txErr);
  else console.log('financial_transactions columns:', Object.keys(tx[0] || {}));

  console.log('--- Verificando profiles ---');
  const { data: pr, error: prErr } = await s.from('profiles').select('*').limit(1);
  if (prErr) console.error('profiles error:', prErr);
  else console.log('profiles columns:', Object.keys(pr[0] || {}));
}

check();
