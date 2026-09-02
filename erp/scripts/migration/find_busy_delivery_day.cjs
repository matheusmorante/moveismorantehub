const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();

    console.log('--- BUSCANDO DIAS COM MAIS ENTREGAS AGENDADAS NO BANCO ---');
    const res = await client.query(`
        SELECT 
            order_data->'shipping'->'scheduling'->>'date' as sched_date,
            COUNT(*) as total_deliveries
        FROM orders
        WHERE order_data->'shipping'->'scheduling'->>'date' IS NOT NULL
        GROUP BY sched_date
        ORDER BY total_deliveries DESC
        LIMIT 10;
    `);

    console.log('Dias mais movimentados de entregas:');
    console.table(res.rows);

    if (res.rows.length > 0) {
        const busyDate = res.rows[0].sched_date;
        console.log(`\n--- BUSCANDO DETALHES DAS ENTREGAS DO DIA ${busyDate} ---`);
        const ordersRes = await client.query(`
            SELECT id, order_number, status, customer_name, order_data
            FROM orders
            WHERE order_data->'shipping'->'scheduling'->>'date' = '${busyDate}'
            ORDER BY order_number ASC;
        `);

        console.log(`Total de pedidos no dia ${busyDate}: ${ordersRes.rows.length}`);
        
        const summaryData = ordersRes.rows.map(r => {
            const od = r.order_data || {};
            const shipping = od.shipping || {};
            const sched = shipping.scheduling || {};
            const address = shipping.address || od.customer?.fullAddress || {};
            const items = od.items || [];
            return {
                id: r.id,
                orderNumber: od.orderIndex || r.order_number,
                customer: r.customer_name || od.customer?.fullName,
                status: r.status,
                city: address.city || 'Colombo',
                neighborhood: address.neighborhood || '',
                street: address.street || '',
                number: address.number || '',
                period: sched.period || 'unspecified',
                time: sched.time || null,
                items: items.map(i => ({
                    name: i.name || i.title || i.productName,
                    quantity: i.quantity || 1,
                    needsAssembly: Boolean(i.needsAssembly || i.hasAssembly || i.assembly)
                })),
                assemblyRequired: od.needsAssembly || items.some(i => i.needsAssembly || i.hasAssembly || i.assembly),
                housingType: address.housingType || null,
                mapsUrl: address.mapsUrl || null,
                observation: shipping.notes || od.notes || address.observation || null
            };
        });

        console.log(JSON.stringify({ busyDate, count: summaryData.length, orders: summaryData }, null, 2));
    }

    await client.end();
}

run().catch(console.error);
