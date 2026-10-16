import { supabase } from './digital-catalog/src/lib/supabase/client.ts';

// We can just query Supabase and check how the CSV route builds rows
const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwNDQ5ODAsImV4cCI6MjA1NzYyMDk4MH0.g_E_Lw5M9zKjN6zQ8rTfXg4eTq5tPqg-0q3pM0n_K1s';

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?deleted_at=is.null&select=id,name,code,status,active,is_draft,deleted,product_variations(id,sku,name,status,active)&limit=100`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  const products = await res.json();
  console.log(`Fetched ${products.length} products.`);

  let simpleCount = 0;
  let varCount = 0;
  for (const p of products) {
    if (p.is_draft || p.deleted || p.active === false) continue;
    const vars = (p.product_variations || []).filter((v) => v.active !== false && v.status !== 'hidden');
    if (vars.length > 0) {
      varCount += vars.length;
    } else if (p.status === 'published') {
      simpleCount++;
      console.log(`Simple product that was sent with UUID (p.id): id=${p.id}, code=${p.code}, name=${p.name}`);
    }
  }
  console.log(`Summary in first 100: ${simpleCount} simple products (which line 403 sends with p.id!), ${varCount} variations (line 342 sends with v.sku)`);
}

main().catch(console.error);
