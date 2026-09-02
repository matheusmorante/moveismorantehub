const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();

    console.log('--- BUSCANDO TABELAS DO BANCO DE DADOS ---');
    const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    `);
    console.log('Tabelas encontradas:', tablesRes.rows.map(r => r.table_name));

    // Verificar se existe orders ou sales_orders ou similar
    for (const t of tablesRes.rows.map(r => r.table_name)) {
        if (t.includes('order') || t.includes('pedido') || t.includes('sale')) {
            console.log(`\n--- COLUNAS DA TABELA ${t} ---`);
            const cols = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${t}' AND table_schema = 'public'
            `);
            console.log(cols.rows.map(c => c.column_name));
        }
    }

    await client.end();
}

run().catch(console.error);
