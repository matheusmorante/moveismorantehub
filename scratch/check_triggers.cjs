const path = require('path');
const { Client } = require(path.resolve(__dirname, '../erp/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function checkTriggers() {
  await client.connect();

  const res = await client.query(`
    SELECT tgname, proname, prosrc 
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE tgrelid = 'auth.users'::regclass
  `);
  console.log('Triggers em auth.users:', JSON.stringify(res.rows, null, 2));

  await client.end();
}

checkTriggers().catch(console.error);
