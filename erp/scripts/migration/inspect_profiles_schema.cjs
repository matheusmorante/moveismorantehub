const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();

    console.log('--- COLUNAS DE profiles ---');
    const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND table_schema = 'public'
    `);
    console.log(cols.rows);

    await client.end();
}

run().catch(console.error);
