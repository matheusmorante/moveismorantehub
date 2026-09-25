import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { isWithinInterval } from '../erp/node_modules/date-fns/index.js';

dotenv.config({ path: 'erp/.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// SQL para testar agregação direta no banco
const testQuery = async (startDate, endDate) => {
    // 1. Agregação de Pedidos (vendas válidas e devoluções)
    const { data: salesRows, error: salesErr } = await supabase
        .from('orders')
        .select(`
            id, total_amount, status, order_type, created_at, deleted,
            order_items(quantity, cost_price)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .or('deleted.is.null,deleted.eq.false');

    if (salesErr) throw salesErr;

    let totalSales = 0;
    let saleCount = 0;
    let totalCmv = 0;
    let pendingOrders = 0;

    const monthlyMap = new Map();

    for (const o of salesRows) {
        const status = o.status;
        const type = o.order_type || 'sale';
        let factor = 0;

        if (['scheduled', 'fulfilled'].includes(status) && ['sale', 'showroom'].includes(type)) {
            factor = 1;
            saleCount++;
        } else if (status === 'fulfilled' && type === 'return') {
            factor = -1;
        }

        if (status === 'scheduled' || status === 'draft') {
            pendingOrders++;
        }

        if (factor !== 0) {
            const val = Number(o.total_amount || 0);
            totalSales += factor * val;

            let orderCmv = 0;
            for (const it of (o.order_items || [])) {
                orderCmv += Number(it.quantity || 1) * Number(it.cost_price || 0);
            }
            totalCmv += factor * orderCmv;

            // Agrupamento mensal
            const monthKey = o.created_at.slice(0, 7); // YYYY-MM
            const currentMonth = monthlyMap.get(monthKey) || { valor: 0, lucro: 0, orders: 0 };
            currentMonth.valor += factor * val;
            currentMonth.lucro += factor * (val - orderCmv);
            if (factor === 1) currentMonth.orders++;
            monthlyMap.set(monthKey, currentMonth);
        }
    }

    const totalProfit = totalSales - totalCmv;
    const grossMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    const avgTicket = saleCount > 0 ? totalSales / saleCount : 0;

    return {
        totalSales,
        saleCount,
        totalCmv,
        totalProfit,
        grossMargin,
        avgTicket,
        pendingOrders,
        monthly: Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    };
};

async function run() {
    console.log('=== TESTE DE AGREGAÇÃO PARA OS TRÊS PERÍODOS ===\n');

    const now = new Date();
    
    // TODAY
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    const resToday = await testQuery(startToday, endToday);
    console.log('--- HOJE ---');
    console.log(`Vendas: R$ ${resToday.totalSales.toFixed(2)} | Qtd: ${resToday.saleCount} | CMV: R$ ${resToday.totalCmv.toFixed(2)} | Lucro: R$ ${resToday.totalProfit.toFixed(2)} | Ticket: R$ ${resToday.avgTicket.toFixed(2)}`);

    // MONTH
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
    const endMonth = endToday;
    const resMonth = await testQuery(startMonth, endMonth);
    console.log('\n--- ESTE MÊS ---');
    console.log(`Vendas: R$ ${resMonth.totalSales.toFixed(2)} | Qtd: ${resMonth.saleCount} | CMV: R$ ${resMonth.totalCmv.toFixed(2)} | Lucro: R$ ${resMonth.totalProfit.toFixed(2)} | Ticket: R$ ${resMonth.avgTicket.toFixed(2)}`);

    // YEAR
    const startYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0).toISOString();
    const endYear = endToday;
    const resYear = await testQuery(startYear, endYear);
    console.log('\n--- ESTE ANO ---');
    console.log(`Vendas: R$ ${resYear.totalSales.toFixed(2)} | Qtd: ${resYear.saleCount} | CMV: R$ ${resYear.totalCmv.toFixed(2)} | Lucro: R$ ${resYear.totalProfit.toFixed(2)} | Margem: ${resYear.grossMargin.toFixed(1)}% | Ticket: R$ ${resYear.avgTicket.toFixed(2)}`);
    console.log('\nPontos mensais do gráfico no ano (12 meses):');
    resYear.monthly.forEach(([m, d]) => {
        console.log(`  Mês ${m}: Vendas R$ ${d.valor.toFixed(2)} | Lucro R$ ${d.lucro.toFixed(2)} | Pedidos: ${d.orders}`);
    });
}

run().catch(console.error);
