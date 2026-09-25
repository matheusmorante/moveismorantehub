import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'erp/.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: todayOrders } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, order_items(id, product_id, description, quantity, unit_price, unit_discount, cost_price)')
        .gte('created_at', startToday)
        .order('created_at', { ascending: false });

    console.log('=== PEDIDOS DE HOJE (' + todayOrders.length + ' pedidos) ===');
    let todayItemCount = 0;
    let todayItemsWithZeroCost = 0;
    todayOrders.forEach(o => {
        console.log(`Pedido #${o.order_number || o.id} | Status: ${o.status} | Total: R$ ${o.total_amount}`);
        (o.order_items || []).forEach(it => {
            todayItemCount++;
            if (Number(it.cost_price || 0) === 0) todayItemsWithZeroCost++;
            console.log(`  -> Item: "${it.description}" | Qtd: ${it.quantity} | Preço: R$ ${it.unit_price} | Desconto: R$ ${it.unit_discount} | cost_price no banco: ${it.cost_price}`);
        });
    });
    console.log(`Itens de Hoje: ${todayItemCount} itens, sendo ${todayItemsWithZeroCost} com cost_price = 0 (${(todayItemsWithZeroCost/todayItemCount*100).toFixed(1)}%)\n`);

    const { data: monthOrders } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, order_items(id, product_id, description, quantity, unit_price, unit_discount, cost_price)')
        .gte('created_at', startMonth)
        .order('created_at', { ascending: false });

    let monthItemCount = 0;
    let monthItemsWithZeroCost = 0;
    let monthItemsWithPositiveCost = 0;
    monthOrders.forEach(o => {
        (o.order_items || []).forEach(it => {
            monthItemCount++;
            const cp = Number(it.cost_price || 0);
            if (cp === 0) monthItemsWithZeroCost++;
            else monthItemsWithPositiveCost++;
        });
    });
    console.log(`=== PEDIDOS DESTE MÊS (${monthOrders.length} pedidos) ===`);
    console.log(`Total itens no mês: ${monthItemCount}`);
    console.log(`Itens com cost_price = 0: ${monthItemsWithZeroCost} (${(monthItemsWithZeroCost/monthItemCount*100).toFixed(1)}%)`);
    console.log(`Itens com cost_price > 0: ${monthItemsWithPositiveCost} (${(monthItemsWithPositiveCost/monthItemCount*100).toFixed(1)}%)`);
}

run().catch(console.error);
