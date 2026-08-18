const { Client } = require('pg');

const oldClient = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.wzpdfmihnwcrgkyagwkd.supabase.co:5432/postgres'
});

const newClient = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await oldClient.connect();
    await newClient.connect();

    console.log('Obtendo colunas do banco de dados antigo...');
    const oldColsRes = await oldClient.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
    `);

    console.log('Obtendo colunas do banco de dados novo...');
    const newColsRes = await newClient.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
    `);

    // Estruturar dados
    const oldSchema = {};
    oldColsRes.rows.forEach(r => {
        if (!oldSchema[r.table_name]) oldSchema[r.table_name] = {};
        oldSchema[r.table_name][r.column_name] = r.data_type;
    });

    const newSchema = {};
    newColsRes.rows.forEach(r => {
        if (!newSchema[r.table_name]) newSchema[r.table_name] = {};
        newSchema[r.table_name][r.column_name] = r.data_type;
    });

    console.log('\n--- TABELAS FALTANTES NO BANCO NOVO ---');
    Object.keys(oldSchema).forEach(table => {
        if (!newSchema[table]) {
            console.log(`Tabela: ${table}`);
        }
    });

    console.log('\n--- COLUNAS FALTANTES EM TABELAS EXISTENTES ---');
    Object.keys(oldSchema).forEach(table => {
        if (newSchema[table]) {
            const missing = [];
            Object.keys(oldSchema[table]).forEach(col => {
                if (!newSchema[table][col]) {
                    missing.push(`${col} (${oldSchema[table][col]})`);
                }
            });
            if (missing.length > 0) {
                console.log(`Tabela: ${table} -> Colunas faltantes: ${missing.join(', ')}`);
            }
        }
    });

    await oldClient.end();
    await newClient.end();
}

run().catch(console.error);
