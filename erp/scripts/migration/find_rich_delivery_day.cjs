const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();

    console.log('--- BUSCANDO TODOS OS PEDIDOS AGENDADOS OU ATENDIDOS COM DETALHES ---');
    const res = await client.query(`
        SELECT id, order_number, status, customer_name, order_data
        FROM orders
        WHERE status IN ('scheduled', 'fulfilled')
        ORDER BY created_at DESC
        LIMIT 50;
    `);

    console.log(`Total de pedidos encontrados: ${res.rows.length}`);

    const daysMap = {};

    res.rows.forEach(r => {
        const od = r.order_data || {};
        const shipping = od.shipping || {};
        const sched = shipping.scheduling || {};
        const date = sched.date || od.scheduledDate || 'Sem data';
        const address = shipping.address || od.customer?.fullAddress || {};
        const items = od.items || [];

        if (!daysMap[date]) daysMap[date] = [];

        daysMap[date].push({
            id: r.id,
            orderNumber: od.orderIndex || `#${String(r.order_number).padStart(6, '0')}`,
            customer: r.customer_name || od.customer?.fullName || 'Cliente',
            status: r.status,
            city: address.city || 'Colombo',
            neighborhood: address.neighborhood || '',
            street: address.street || '',
            number: address.number || '',
            period: sched.period || 'morning', // morning / afternoon / unspecified
            time: sched.time || null,
            items: items.map(i => ({
                name: i.name || i.title || i.productName || 'Item',
                quantity: i.quantity || 1,
                needsAssembly: Boolean(i.needsAssembly || i.hasAssembly || i.assembly)
            })),
            assemblyRequired: od.needsAssembly || items.some(i => i.needsAssembly || i.hasAssembly || i.assembly),
            housingType: address.housingType || null,
            mapsUrl: address.mapsUrl || null,
            observation: shipping.notes || od.notes || address.observation || null,
            distanceKm: shipping.distanceKm || (address.city && address.city !== 'Colombo' ? 24.5 : 4.8)
        });
    });

    console.log('\n--- RESUMO DE DIAS COM PEDIDOS ---');
    Object.keys(daysMap).forEach(d => {
        console.log(`Data: ${d} -> ${daysMap[d].length} pedidos`);
    });

    // Pega o dia com mais pedidos com itens
    const bestDate = Object.keys(daysMap).sort((a, b) => daysMap[b].length - daysMap[a].length)[0];
    console.log(`\n=== MELHOR DIA SELECIONADO: ${bestDate} ===`);
    console.log(JSON.stringify(daysMap[bestDate], null, 2));

    await client.end();
}

run().catch(console.error);
