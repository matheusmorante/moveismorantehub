import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { isSameDay, subDays, differenceInCalendarDays, startOfDay, endOfDay, subMonths, isWithinInterval } from '../erp/node_modules/date-fns/index.js';

dotenv.config({ path: 'erp/.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('=== AUDITORIA DE PRECISÃO FINANCEIRA DO DASHBOARD ===\n');

    // 1. Amostra de pedidos recentes concluídos / agendados de hoje
    const { data: sampleOrders } = await supabase
        .from('orders')
        .select(`
            id, order_number, order_index, status, order_type, total_amount, created_at,
            order_items(id, description, quantity, unit_price, unit_discount, cost_price, is_temporary_product)
        `)
        .in('status', ['scheduled', 'fulfilled'])
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(6);

    console.log('--- AMOSTRA REAL DE 6 PEDIDOS CONCLUÍDOS/AGENDADOS ---');
    for (const o of sampleOrders) {
        let manualItemRevenue = 0;
        let manualCmv = 0;
        let itemsWithoutCost = 0;

        for (const it of (o.order_items || [])) {
            const qty = Number(it.quantity || 1);
            const price = Number(it.unit_price || 0);
            const discount = Number(it.unit_discount || 0);
            const cost = Number(it.cost_price || 0);

            const itemNetRev = qty * (price - discount);
            manualItemRevenue += itemNetRev;

            if (cost > 0) {
                manualCmv += qty * cost;
            } else {
                itemsWithoutCost++;
            }
        }

        const manualGrossProfit = Number(o.total_amount) - manualCmv;

        console.log(`\nPedido #${o.order_number || o.order_index || o.id} (${o.status}, tipo: ${o.order_type || 'sale'}):`);
        console.log(`  Data: ${o.created_at}`);
        console.log(`  Total da Ordem (banco): R$ ${Number(o.total_amount).toFixed(2)}`);
        console.log(`  Soma Líquida dos Itens (qtd * [preço - desc]): R$ ${manualItemRevenue.toFixed(2)}`);
        console.log(`  CMV calculado manual: R$ ${manualCmv.toFixed(2)} (itens sem custo: ${itemsWithoutCost}/${o.order_items.length})`);
        console.log(`  Lucro Bruto manual: R$ ${manualGrossProfit.toFixed(2)}`);
    }

    // 2. Amostra de pedidos que REALMENTE possuem cost_price > 0 no histórico
    const { data: ordersWithRealCost } = await supabase
        .from('orders')
        .select(`
            id, order_number, order_index, status, order_type, total_amount, created_at,
            order_items!inner(id, description, quantity, unit_price, unit_discount, cost_price)
        `)
        .gt('order_items.cost_price', 0)
        .in('status', ['scheduled', 'fulfilled'])
        .eq('deleted', false)
        .limit(3);

    console.log('\n--- AMOSTRA DE PEDIDOS HISTÓRICOS QUE POSSUEM cost_price > 0 ---');
    for (const o of ordersWithRealCost) {
        let manualCmv = 0;
        (o.order_items || []).forEach(it => {
            const qty = Number(it.quantity || 1);
            const cost = Number(it.cost_price || 0);
            manualCmv += qty * cost;
            console.log(`  Item: "${it.description}" | Qtd: ${qty} | Preço: R$ ${it.unit_price} | cost_price: R$ ${cost}`);
        });
        const manualProfit = Number(o.total_amount) - manualCmv;
        const manualMargin = (manualProfit / Number(o.total_amount)) * 100;
        console.log(`Pedido #${o.order_number || o.id}: Total R$ ${Number(o.total_amount).toFixed(2)} | CMV: R$ ${manualCmv.toFixed(2)} | Lucro: R$ ${manualProfit.toFixed(2)} | Margem: ${manualMargin.toFixed(1)}%\n`);
    }

    // 3. Censo de preenchimento de custo em toda a base
    const { count: totalItems } = await supabase.from('order_items').select('*', { count: 'exact', head: true });
    const { count: itemsWithZero } = await supabase.from('order_items').select('*', { count: 'exact', head: true }).eq('cost_price', 0);
    const { count: itemsWithCost } = await supabase.from('order_items').select('*', { count: 'exact', head: true }).gt('cost_price', 0);

    console.log('--- CENSO COMPLETO DE CUSTO EM order_items ---');
    console.log(`Total itens em pedidos: ${totalItems}`);
    console.log(`Itens com cost_price = 0: ${itemsWithZero} (${(itemsWithZero / totalItems * 100).toFixed(1)}%)`);
    console.log(`Itens com cost_price > 0: ${itemsWithCost} (${(itemsWithCost / totalItems * 100).toFixed(1)}%)`);
}

run().catch(console.error);
