const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  // 1. Todas as colunas json/jsonb/array no schema public
  const jsonCols = await client.query(`
    SELECT 
      c.table_name,
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable,
      c.column_default
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND (
        c.data_type IN ('json', 'jsonb', 'ARRAY') 
        OR c.udt_name LIKE '\\_%'
      )
    ORDER BY c.table_name, c.column_name;
  `);

  console.log('=== COLUNAS JSONB / JSON / ARRAY NO BANCO ===');
  console.table(jsonCols.rows);

  // 2. Relações / Foreign Keys existentes no schema public
  const fks = await client.query(`
    SELECT
      tc.table_name, 
      kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `);

  console.log('\\n=== FOREIGN KEYS NO SCHEMA PUBLIC ===');
  console.table(fks.rows);

  // 3. Índices existentes nas tabelas principais
  const idxs = await client.query(`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('orders', 'products', 'product_variations', 'people', 'inbound_invoices', 'purchases', 'goods_receipts', 'inventory_moves')
    ORDER BY tablename, indexname;
  `);

  console.log('\\n=== ÍNDICES NAS TABELAS PRINCIPAIS ===');
  console.table(idxs.rows.map(r => ({ table: r.tablename, index: r.indexname, def: r.indexdef.slice(0, 80) })));

  // 4. Todas as tabelas no schema public
  const tables = await client.query(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  const fs = require('fs');
  fs.writeFileSync('src/scratch/catalog_audit.json', JSON.stringify({
    jsonCols: jsonCols.rows,
    fks: fks.rows,
    indexes: idxs.rows,
    tables: tables.rows
  }, null, 2));
  console.log('Saved catalog audit to src/scratch/catalog_audit.json');

  await client.end();
}

run().catch(console.error);
