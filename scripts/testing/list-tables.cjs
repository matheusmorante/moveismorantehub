const { Client } = require('../../erp/node_modules/pg');

async function run() {
    const connStr = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
    const client = new Client({ connectionString: connStr });
    await client.connect();

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(res.rows.map(r => r.table_name));

    await client.end();
}

run().catch(console.error);
