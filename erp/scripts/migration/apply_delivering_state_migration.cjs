const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    try {
        console.log('Conectando ao PostgreSQL do Supabase...');
        await client.connect();
        console.log('Conectado com sucesso!');

        const sqlPath = path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '20260912123500_add_delivering_state_to_team_locations.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executando migration add_delivering_state_to_team_locations...');
        await client.query(sql);
        console.log('Migration executada com sucesso no Supabase!');
    } catch (err) {
        console.error('Erro ao executar migration:', err);
    } finally {
        await client.end();
    }
}

run();
