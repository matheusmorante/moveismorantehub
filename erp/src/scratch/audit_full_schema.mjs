import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAll() {
  const tables = [
    'orders',
    'products',
    'inbound_invoices',
    'goods_receipts',
    'purchases',
    'inventory_moves',
    'people',
    'financial_transactions',
    'categories',
    'product_images',
    'product_supplier_codes',
    'team_locations',
    'settings'
  ];

  const results = {};

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(2);

    if (error) {
      results[table] = { status: 'error', message: error.message };
    } else {
      const sample = data && data[0] ? data[0] : null;
      const columns = {};
      if (sample) {
        for (const [col, val] of Object.entries(sample)) {
          let type = typeof val;
          let preview = '';
          if (val === null) {
            type = 'null (type unknown)';
          } else if (Array.isArray(val)) {
            type = `array[${val.length}]`;
            if (val.length > 0 && typeof val[0] === 'object') {
              preview = `item sample keys: ${Object.keys(val[0]).slice(0, 10).join(', ')}`;
            }
          } else if (typeof val === 'object') {
            type = 'jsonb/object';
            preview = `keys: ${Object.keys(val).slice(0, 10).join(', ')}`;
          } else {
            preview = String(val).slice(0, 40);
          }
          columns[col] = { type, preview };
        }
      }
      results[table] = {
        status: 'ok',
        count,
        columnCount: sample ? Object.keys(sample).length : 0,
        columns,
        hasSample: !!sample
      };
    }
  }

  import('fs').then(fs => {
    fs.writeFileSync('src/scratch/full_schema_results.json', JSON.stringify(results, null, 2));
    console.log('Saved to src/scratch/full_schema_results.json');
  });
}

inspectAll().catch(console.error);
