import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const { error: updErr1 } = await supabase.from('product_variations').update({ sku: '000001-COMP-01' }).eq('id', '9826e7ca-e2b8-422a-b73d-3961d061d729');
  if (updErr1) console.error(updErr1); else console.log('Updated var 1 to 000001-COMP-01');

  const { error: updErr2 } = await supabase.from('product_variations').update({ sku: '000001-COMP-02' }).eq('id', 'd5919f46-45aa-4337-9a75-9fb0fd400678');
  if (updErr2) console.error(updErr2); else console.log('Updated var 2 to 000001-COMP-02');
}
run();
