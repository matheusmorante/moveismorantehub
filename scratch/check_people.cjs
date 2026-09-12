const path = require('path');
const { Client } = require(path.resolve(__dirname, '../erp/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function check() {
  await client.connect();

  console.log('--- TIPOS DE PESSOAS EM PEOPLE ---');
  const resPeople = await client.query(`
    SELECT DISTINCT person_type FROM public.people
  `);
  console.log(JSON.stringify(resPeople.rows, null, 2));

  console.log('\n--- VENDEDORES / FUNCIONÁRIOS EM PEOPLE ---');
  const resSellers = await client.query(`
    SELECT id, person_type, full_name, email, phone 
    FROM public.people 
    WHERE person_type != 'customers'
    LIMIT 30
  `);
  console.log(JSON.stringify(resSellers.rows, null, 2));

  await client.end();
}

check().catch(console.error);
