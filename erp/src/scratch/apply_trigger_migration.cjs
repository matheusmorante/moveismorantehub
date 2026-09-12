const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  const migrationPath = path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '20260912151000_update_order_sync_trigger.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Aplicando migration 20260912151000_update_order_sync_trigger.sql...');
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  console.log('Migration aplicada com sucesso!');

  await client.end();
}

run().catch(console.error);
