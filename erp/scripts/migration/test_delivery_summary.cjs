const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();

    const res = await client.query(`
        SELECT order_number, customer_name, order_data
        FROM orders
        WHERE order_data->'shipping'->'scheduling'->>'date' IN ('2026-08-27', '2026-08-24')
        LIMIT 10;
    `);

    console.log('Pedidos resgatados:', res.rows.length);

    await client.end();
}

run().catch(console.error);
