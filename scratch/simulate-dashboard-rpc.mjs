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

function isDashboardSaleOrder(order) {
    if (!order || order.deleted) return false;
    const status = String(order.status || '').trim().toLowerCase();
    const orderType = order.order_type || order.orderType || 'sale';
    if (status === 'cancelled') return false;
    if (orderType === 'return' || orderType === 'assistance') return false;
    return status === 'scheduled' || status === 'fulfilled';
}

function dashboardRevenueFactor(order) {
    if (!order || order.deleted) return 0;
    const status = String(order.status || '').trim().toLowerCase();
    const orderType = order.order_type || order.orderType || 'sale';
    if (status === 'cancelled') return 0;
    if (orderType === 'return' && status === 'fulfilled') return -1;
    if (['scheduled', 'fulfilled'].includes(status) && ['sale', 'showroom'].includes(orderType)) return 1;
    return 0;
}

function calcOrderCmv(order) {
    let cmv = 0;
    let itemsWithout = 0;
    for (const item of (order.order_items || order.items || [])) {
        if (item.is_temporary_product || item.isTemporaryProduct || !item.product_id) continue;
        const qty = Number(item.quantity || 0);
        const unitCost = item.unit_cost ?? item.unitCost ?? item.cost_price ?? item.costPrice ?? null;
        if (unitCost === null || unitCost === undefined) {
            itemsWithout++;
        } else {
            cmv += qty * Number(unitCost);
        }
    }
    return { cmv, partial: itemsWithout > 0, itemsWithout };
}

// 1. Fonte A Atual (Raw Orders)
async function fetchCurrentSourceA(start, end) {
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

// Cálculo dos KPIs canônicos no formato do frontend
function computeKpisAndProducts(rows) {
    let totalSales = 0;
    let saleCount = 0;
    let totalCmv = 0;
    let totalProfit = 0;
    let itemsWithoutCost = 0;

    const productMap = new Map();

    for (const order of rows) {
        const factor = dashboardRevenueFactor(order);
        if (isDashboardSaleOrder(order)) {
            saleCount++;
        }

        if (factor !== 0) {
            const orderVal = Number(order.total_amount || 0);
            totalSales += factor * orderVal;

            const { cmv, itemsWithout } = calcOrderCmv(order);
            totalCmv += factor * cmv;
            totalProfit += factor * (orderVal - cmv);
            itemsWithoutCost += itemsWithout;

            // Produtos
            for (const item of (order.order_items || [])) {
                if (!item.product_id || item.is_temporary_product) continue;
                const key = item.variation_id || item.product_id;
                const existing = productMap.get(key) || {
                    productId: item.product_id,
                    variationId: item.variation_id,
                    name: item.description || '',
                    quantity: 0,
                    revenue: 0,
                    profit: 0
                };
                const qty = Number(item.quantity || 0);
                const unitPrice = Number(item.unit_price || 0);
                const discount = Number(item.unit_discount || 0);
                const unitCost = Number(item.cost_price || 0);
                const rev = (unitPrice - discount) * qty;
                const cost = unitCost * qty;

                existing.quantity += factor * qty;
                existing.revenue += factor * rev;
                existing.profit += factor * (rev - cost);
                productMap.set(key, existing);
            }
        }
    }

    const avgTicket = saleCount > 0 ? totalSales / saleCount : 0;
    const grossMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    const top5 = (arr, key) => [...arr].sort((a, b) => b[key] - a[key]).slice(0, 5);
    const allProducts = Array.from(productMap.values());

    return {
        kpis: {
            totalSales: Number(totalSales.toFixed(2)),
            saleCount,
            totalCmv: Number(totalCmv.toFixed(2)),
            totalProfit: Number(totalProfit.toFixed(2)),
            grossMargin: Number(grossMargin.toFixed(2)),
            avgTicket: Number(avgTicket.toFixed(2)),
            itemsWithoutCost
        },
        topProducts: {
            byQuantity: top5(allProducts, 'quantity').map(p => ({ id: p.productId, name: p.name, quantity: p.quantity })),
            byRevenue: top5(allProducts, 'revenue').map(p => ({ id: p.productId, name: p.name, revenue: Number(p.revenue.toFixed(2)) })),
            byProfit: top5(allProducts, 'profit').map(p => ({ id: p.productId, name: p.name, profit: Number(p.profit.toFixed(2)) }))
        }
    };
}

// 2. Simulação do Payload Agregado Retornado por uma RPC Server-side
function generateAggregatedPayload(currentKpis, chartPoints, topProducts) {
    return {
        kpis: currentKpis,
        chart: chartPoints,
        topProducts
    };
}

async function run() {
    const now = new Date();
    const periods = [
        {
            name: 'Hoje',
            start: startOfDay(now).toISOString(),
            end: endOfDay(now).toISOString()
        },
        {
            name: 'Este Mês',
            start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).toISOString(),
            end: endOfDay(now).toISOString()
        },
        {
            name: 'Este Ano',
            start: startOfDay(new Date(now.getFullYear(), 0, 1)).toISOString(),
            end: endOfDay(now).toISOString()
        }
    ];

    console.log('========================================================================');
    console.log('AUDITORIA DE AGREGAÇÃO SERVER-SIDE DA FONTE A (KPIS, GRÁFICO, PRODUTOS)');
    console.log('========================================================================\n');

    for (const p of periods) {
        console.log(`>>> PERÍODO: ${p.name.toUpperCase()} <<<`);
        const { rows, bytes: rawBytes } = await fetchCurrentSourceA(p.start, p.end);
        const { kpis, topProducts } = computeKpisAndProducts(rows);

        // Gera o payload agregado exato que a RPC retorna
        const mockChart = p.name === 'Hoje' 
            ? Array.from({ length: 24 }, (_, i) => ({ label: `${i}h`, valor: 0, lucro: 0, orders: 0 }))
            : p.name === 'Este Mês'
                ? Array.from({ length: 30 }, (_, i) => ({ label: `${i+1}/09`, valor: 0, lucro: 0, orders: 0 }))
                : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map(m => ({ label: `${m}/26`, valor: 0, lucro: 0, orders: 0 }));

        const aggregatedPayload = generateAggregatedPayload(kpis, mockChart, topProducts);
        const aggregatedBytes = new TextEncoder().encode(JSON.stringify(aggregatedPayload)).byteLength;

        const rawKb = (rawBytes / 1024).toFixed(2);
        const aggKb = (aggregatedBytes / 1024).toFixed(2);
        const reduction = ((1 - aggregatedBytes / rawBytes) * 100).toFixed(1);

        console.log(`  Ordens Brutas Analisadas: ${rows.length}`);
        console.log(`  KPIs Calculados:`);
        console.log(`    - Faturamento: R$ ${kpis.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        console.log(`    - Qtd Vendas:  ${kpis.saleCount}`);
        console.log(`    - Ticket Médio: R$ ${kpis.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        console.log(`    - CMV:         R$ ${kpis.totalCmv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        console.log(`    - Lucro Bruto: R$ ${kpis.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        console.log(`    - Margem:      ${kpis.grossMargin}%`);
        console.log(`  Top 1 Produto por Faturamento: ${topProducts.byRevenue[0]?.name || 'N/A'} (R$ ${topProducts.byRevenue[0]?.revenue || 0})`);
        console.log(`  --- MEDIÇÃO DE BYTES ---`);
        console.log(`  Fonte A Atual (Raw Orders):      ${rawKb} KB`);
        console.log(`  Fonte A Agregada (Server-Side):  ${aggKb} KB`);
        console.log(`  Redução de Egress na Fonte A:    ${reduction}%\n`);
    }
}

run().catch(console.error);
