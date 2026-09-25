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

async function measurePayload(name, queryFn) {
    const start = performance.now();
    const data = await queryFn();
    const duration = Math.round(performance.now() - start);
    const bytes = new TextEncoder().encode(JSON.stringify(data)).byteLength;
    const kb = (bytes / 1024).toFixed(2);
    return { name, count: Array.isArray(data) ? data.length : 1, bytes, kb, duration, data };
}

async function run() {
    console.log('--- MEDIÇÃO REAL DAS 3 FONTES DESACOPLADAS ---');
    const now = new Date();

    // 1. Fonte C: Pedidos Recentes (.limit(5))
    const sourceC = await measurePayload('Fonte C: RecentOrders (limit 5)', async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, order_index, status, order_type, customer_name, total_amount, created_at')
            .in('status', ['scheduled', 'fulfilled'])
            .or('deleted.is.null,deleted.eq.false')
            .order('created_at', { ascending: false })
            .limit(5);
        if (error) console.error('Erro Fonte C:', error);
        return data || [];
    });

    // 2. Fonte B: Radar Geográfico (.limit(50))
    const sourceB = await measurePayload('Fonte B: GeoMapPanel (limit 50)', async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('id, total_amount, status, order_type, customer_name, order_data')
            .in('status', ['scheduled', 'fulfilled'])
            .or('deleted.is.null,deleted.eq.false')
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) console.error('Erro Fonte B:', error);
        return data || [];
    });

    // 3. Fonte A: Agregados/KPIs & Gráficos por Período
    const periods = [
        {
            name: 'Hoje',
            start: startOfDay(subDays(now, 1)).toISOString(),
            end: endOfDay(now).toISOString()
        },
        {
            name: 'Este Mês',
            start: startOfDay(subMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1)).toISOString(),
            end: endOfDay(now).toISOString()
        },
        {
            name: 'Este Ano',
            start: startOfDay(new Date(now.getFullYear() - 1, 0, 1)).toISOString(),
            end: endOfDay(now).toISOString()
        }
    ];

    for (const p of periods) {
        console.log(`\n=== PERÍODO: ${p.name.toUpperCase()} ===`);
        const sourceA = await measurePayload(`Fonte A: KPIs & Gráfico (${p.name})`, async () => {
            let from = 0;
            const pageSize = 1000;
            const rows = [];
            while (true) {
                const { data, error } = await supabase
                    .from('orders')
                    .select(DASHBOARD_ORDERS_COLUMNS)
                    .gte('created_at', p.start)
                    .lte('created_at', p.end)
                    .order('created_at', { ascending: false })
                    .range(from, from + pageSize - 1);
                if (error) {
                    console.error('Erro Fonte A:', error);
                    break;
                }
                if (data) rows.push(...data);
                if (!data || data.length < pageSize) break;
                from += pageSize;
            }
            return rows;
        });

        const totalBytes = Number(sourceA.bytes) + Number(sourceB.bytes) + Number(sourceC.bytes);
        const totalKb = (totalBytes / 1024).toFixed(2);

        console.log(`  - Fonte A (KPIs & Gráficos): ${sourceA.count} ordens | ${sourceA.kb} KB (${sourceA.duration}ms)`);
        console.log(`  - Fonte B (Radar Geográfico): ${sourceB.count} ordens | ${sourceB.kb} KB (${sourceB.duration}ms)`);
        console.log(`  - Fonte C (Pedidos Recentes): ${sourceC.count} ordens | ${sourceC.kb} KB (${sourceC.duration}ms)`);
        console.log(`  => TOTAL COMBINADO (3 FONTES): ${totalKb} KB`);
        console.log(`  => ANTERIOR (Monolítico): ~3.401,37 KB`);
        console.log(`  => REDUÇÃO REAL MEDIDA: ${((1 - totalBytes / (3401.37 * 1024)) * 100).toFixed(1)}%`);
    }
}

run().catch(console.error);
