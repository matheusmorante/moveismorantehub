const path = require('path');
const { Client } = require(path.resolve(__dirname, '../erp/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function findMore() {
  await client.connect();

  const res = await client.query(`
    SELECT id, person_type, full_name, email, phone 
    FROM public.people 
    WHERE full_name ILIKE '%liliane%' OR full_name ILIKE '%lucas%' OR email ILIKE '%liliane%' OR email ILIKE '%lucas%'
  `);
  console.log('Liliane e Lucas:', JSON.stringify(res.rows, null, 2));

  await client.end();
}

findMore().catch(console.error);
