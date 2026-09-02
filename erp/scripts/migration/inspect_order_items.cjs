const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();

    const res = await client.query(`
        SELECT order_number, customer_name, order_data
        FROM orders
        WHERE order_data->'shipping'->'scheduling'->>'date' IN ('2026-08-27', '2026-08-22', '2026-08-24');
    `);

    res.rows.forEach(r => {
        const od = r.order_data || {};
        console.log(`\nPedido #${od.orderIndex || r.order_number} - Cliente: ${r.customer_name || od.customer?.fullName}`);
        console.log(`Cidade: ${od.shipping?.address?.city || od.customer?.fullAddress?.city || 'Colombo'} | Bairro: ${od.shipping?.address?.neighborhood || od.customer?.fullAddress?.neighborhood || 'Atuba'}`);
        console.log(`Horário/Turno: ${od.shipping?.scheduling?.period || 'tarde'} (${od.shipping?.scheduling?.time || '13-18h'})`);
        console.log('Itens:', od.items?.map(i => `${i.quantity || 1}x ${i.name || i.title || i.productName || 'Móvel'} (Montagem: ${i.needsAssembly || i.hasAssembly || i.assembly ? 'Sim' : 'Não'})`));
        if (od.shipping?.notes || od.notes) console.log(`Observações: ${od.shipping?.notes || od.notes}`);
    });

    await client.end();
}

run().catch(console.error);
