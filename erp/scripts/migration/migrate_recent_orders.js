import { createClient } from '@supabase/supabase-js';

const OLD_DB_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const OLD_DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const NEW_DB_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const NEW_DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const oldSupabase = createClient(OLD_DB_URL, OLD_DB_KEY);
const newSupabase = createClient(NEW_DB_URL, NEW_DB_KEY);

async function run() {
    console.log('=== INICIANDO MIGRAÇÃO DE PEDIDOS ===');
    console.log(`Lendo pedidos do banco antigo (${OLD_DB_URL})...`);
    
    const { data: oldOrders, error: oldError } = await oldSupabase
        .from('orders')
        .select('*');

    if (oldError) {
        console.error('Erro ao ler pedidos do banco antigo:', oldError);
        return;
    }

    console.log(`Encontrados ${oldOrders.length} pedidos no banco antigo.`);

    console.log(`Lendo pedidos do banco novo (${NEW_DB_URL})...`);
    const { data: newOrders, error: newError } = await newSupabase
        .from('orders')
        .select('id');

    if (newError) {
        console.error('Erro ao ler pedidos do banco novo:', newError);
        return;
    }

    const newOrderIds = new Set(newOrders.map(o => String(o.id)));
    console.log(`Encontrados ${newOrders.length} pedidos no banco novo.`);

    const ordersToMigrate = oldOrders.filter(o => !newOrderIds.has(String(o.id)));

    console.log(`Há ${ordersToMigrate.length} pedidos para migrar.`);

    if (ordersToMigrate.length === 0) {
        console.log('Nenhum pedido novo encontrado para migrar.');
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const order of ordersToMigrate) {
        console.log(`Migrando pedido ID: ${order.id}...`);
        
        // Remove ids internos de order_data se necessário ou migra diretamente
        const { error: insertError } = await newSupabase
            .from('orders')
            .insert({
                id: order.id,
                order_data: order.order_data,
                updated_at: order.updated_at
            });

        if (insertError) {
            console.error(`Erro ao migrar pedido ID ${order.id}:`, insertError.message);
            failCount++;
        } else {
            console.log(`Pedido ID ${order.id} migrado com sucesso!`);
            successCount++;
        }
    }

    console.log(`\n=== RESUMO DA MIGRAÇÃO ===`);
    console.log(`Pedidos migrados com sucesso: ${successCount}`);
    console.log(`Falhas de migração: ${failCount}`);
}

run().catch(console.error);
