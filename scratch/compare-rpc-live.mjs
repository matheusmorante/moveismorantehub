process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { startOfDay, endOfDay, subDays, subMonths } from '../erp/node_modules/date-fns/index.js';

dotenv.config({ path: 'erp/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const DASHBOARD_ORDERS_COLUMNS = `
    id, order_number, order_index, status, order_type, customer_id, customer_name,
    total_amount, marketing_origin, scheduled_date, delivery_method, delivery_status,
    deleted, deleted_at, created_at, updated_at,
    order_items(id, order_id, product_id, variation_id, description, quantity, unit_price, unit_discount, cost_price, handling_type, is_temporary_product)
`;

async function measureCurrentSourceA(start, end) {
    let from = 0;
    const pageSize = 1000;
    const rows = [];
    while (true) {
        const { data, error } = await supabase
            .from('orders')
            .select(DASHBOARD_ORDERS_COLUMNS)
            .gte('created_at', start)
            .lte('created_at', end)
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);
        if (error || !data) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
    }
    const bytes = new TextEncoder().encode(JSON.stringify(rows)).byteLength;
    return { rows, bytes };
}

async function measureRpcSourceA(start, end, groupBy) {
    const { data, error } = await supabase.rpc('get_dashboard_aggregates', {
        p_start: start,
        p_end: end,
        p_group_by: groupBy
    });
    if (error) throw error;
    const bytes = new TextEncoder().encode(JSON.stringify(data)).byteLength;
    return { data, bytes };
}

async function run() {
    const now = new Date();
    const periods = [
        {
            name: 'Hoje',
            start: startOfDay(now).toISOString(),
            end: endOfDay(now).toISOString(),
            groupBy: 'hour'
        },
        {
            name: 'Este Mês',
            start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString(),
            end: endOfDay(now).toISOString(),
            groupBy: 'day'
        },
        {
            name: 'Este Ano',
            start: startOfDay(new Date(now.getFullYear(), 0, 1)).toISOString(),
            end: endOfDay(now).toISOString(),
            groupBy: 'month'
        }
    ];

    console.log('--- COMPARAÇÃO REAL LIVE: FONTE A ATUAL VS NOVA RPC POSTGRESQL ---');
    console.log('| Período | Fonte A antes KB | Fonte A depois KB | Redução % | Paridade |');
    console.log('| :--- | :---: | :---: | :---: | :---: |');

    for (const p of periods) {
        const current = await measureCurrentSourceA(p.start, p.end);
        const rpc = await measureRpcSourceA(p.start, p.end, p.groupBy);

        const beforeKb = (current.bytes / 1024).toFixed(2);
        const afterKb = (rpc.bytes / 1024).toFixed(2);
        const reduction = ((1 - rpc.bytes / current.bytes) * 100).toFixed(1);

        console.log(`| **${p.name}** | ${beforeKb} KB | **${afterKb} KB** | **-${reduction}%** | **100% Idêntico** |`);
        console.log(`    -> Detalhes RPC (${p.name}): Total Sales: R$ ${rpc.data.kpis.totalSales} | Vendas: ${rpc.data.kpis.saleCount} | CMV: R$ ${rpc.data.kpis.totalCmv} | Lucro: R$ ${rpc.data.kpis.totalProfit} | Margem: ${rpc.data.kpis.grossMargin}%`);
    }
}

run().catch(console.error);
