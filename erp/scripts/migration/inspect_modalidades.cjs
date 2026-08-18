const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();

    console.log('--- DISTINÇÃO DE order_data->shipping->orderType ---');
    const resTypes = await client.query(`
        SELECT DISTINCT order_data->'shipping'->>'orderType' as order_type, COUNT(*) 
        FROM public.orders 
        GROUP BY order_type
    `);
    console.log(resTypes.rows);

    console.log('\n--- DISTINÇÃO DE order_data->orderType ---');
    const resTypes2 = await client.query(`
        SELECT DISTINCT order_data->>'orderType' as order_type, COUNT(*) 
        FROM public.orders 
        GROUP BY order_type
    `);
    console.log(resTypes2.rows);

    console.log('\n--- DISTINÇÃO DE status ---');
    const resStatus = await client.query(`
        SELECT DISTINCT status, COUNT(*) 
        FROM public.orders 
        GROUP BY status
    `);
    console.log(resStatus.rows);

    await client.end();
}

run().catch(console.error);
