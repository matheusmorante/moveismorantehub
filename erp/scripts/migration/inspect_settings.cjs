const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();

    const res = await client.query("SELECT data FROM public.settings WHERE id = 'app'");
    if (res.rows.length > 0) {
        const data = res.rows[0].data;
        console.log('--- CONFIGURAÇÕES ATUAIS DO BD (data) ---');
        console.log('deliveryHandlingOptions:', JSON.stringify(data.deliveryHandlingOptions, null, 2));
        console.log('pickupHandlingOptions:', JSON.stringify(data.pickupHandlingOptions, null, 2));
    } else {
        console.log('Configurações (settings) não encontradas no BD.');
    }

    await client.end();
}

run().catch(console.error);
