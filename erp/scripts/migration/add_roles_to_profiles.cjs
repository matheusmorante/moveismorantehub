const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();

    console.log('--- Adicionando coluna roles na tabela profiles se nao existir ---');
    await client.query(`
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles text[];
    `);
    console.log('Coluna roles adicionada com sucesso!');

    const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND table_schema = 'public'
    `);
    console.log('Colunas atualizadas de profiles:');
    console.log(cols.rows);

    await client.end();
}

run().catch(console.error);
