import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { isSameDay, subDays, differenceInCalendarDays, startOfDay, endOfDay, subMonths, isWithinInterval } from '../erp/node_modules/date-fns/index.js';

dotenv.config({ path: 'erp/.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Import exact dashboardRevenue functions logic
function isDashboardSaleOrder(order) {
    if (!order || order.deleted) return false;
    const status = order.status;
    const orderType = order.orderType;
    if (status === 'cancelled') return false;
    if (orderType === 'return' || orderType === 'assistance') return false;
    return true;
}

function dashboardRevenueFactor(order) {
    if (!order || order.deleted) return 0;
    const status = order.status;
    const orderType = order.orderType;
    if (status === 'cancelled') return 0;
    if (orderType === 'return') return -1;
    if (orderType === 'assistance') return 0;
    return 1;
}

function getDefinitiveOrderValue(order) {
    if (!order) return 0;
    const directTotal = order.totalAmount ?? order.total_amount ?? order.total;
    if (typeof directTotal === 'number' && !isNaN(directTotal) && directTotal > 0) return directTotal;
    const items = order.items || [];
    if (items.length > 0) {
        return items.reduce((sum, item) => sum + (Number(item.totalPrice || item.total_price || (item.quantity * item.unitPrice)) || 0), 0);
    }
    return 0;
}

function getDashboardRevenueImpact(order) {
    const factor = dashboardRevenueFactor(order);
    if (factor === 0) return 0;
    return factor * getDefinitiveOrderValue(order);
}

function calcOrderCmv(order) {
    let cmv = 0;
    let itemsWithout = 0;
    for (const item of (order.items || [])) {
        if (item.isTemporaryProduct || !item.productId) continue;
        const qty = item.quantity || 0;
        const unitCost = item.unitCost ?? item.costPrice ?? null;
        if (unitCost === null || unitCost === undefined) {
            itemsWithout++;
        } else {
            cmv += qty * unitCost;
        }
    }
    return { cmv, partial: itemsWithout > 0, itemsWithout };
}

function parsePTBRDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    try {
        if (dateStr.includes('-')) {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        }
        const dayPartMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (!dayPartMatch) return null;
        const [_, day, month, year] = dayPartMatch;
        const [__, timePart] = dateStr.split(', ');
        let hour = 0, minute = 0, second = 0;
        if (timePart) {
            const [h, min, s] = timePart.split(':');
            hour = parseInt(h) || 0;
            minute = parseInt(min) || 0;
            second = parseInt(s) || 0;
        }
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, minute, second);
        return isNaN(dateObj.getTime()) ? null : dateObj;
    } catch {
        return null;
    }
}

function getIntervals(period) {
    const now = new Date();
    let current, prev;
    if (period === 'month') {
        current = { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
        prev = { start: startOfDay(subMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1)), end: endOfDay(subDays(new Date(now.getFullYear(), now.getMonth(), 1), 1)) };
    } else if (period === 'today') {
        current = { start: startOfDay(now), end: endOfDay(now) };
        prev = { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
    } else if (period === 'year') {
        current = { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now) };
        prev = { start: startOfDay(new Date(now.getFullYear() - 1, 0, 1)), end: endOfDay(new Date(now.getFullYear() - 1, 11, 31)) };
    }
    return { current, prev };
}

function calculateStats(filteredOrdersList) {
    const saleOrders = filteredOrdersList.filter(isDashboardSaleOrder);
    const revenueOrders = filteredOrdersList.filter(o => dashboardRevenueFactor(o) !== 0);

    const totalSales = revenueOrders.reduce((acc, curr) => acc + getDashboardRevenueImpact(curr), 0);
    const saleCount = saleOrders.length;
    const avgTicket = saleCount > 0 ? totalSales / saleCount : 0;
    const totalOrdersCount = filteredOrdersList.length;

    let totalCmv = 0;
    let cmvPartial = false;
    let itemsWithoutCost = 0;

    for (const order of revenueOrders) {
        const { cmv, partial, itemsWithout } = calcOrderCmv(order);
        totalCmv += cmv * dashboardRevenueFactor(order);
        if (partial) cmvPartial = true;
        itemsWithoutCost += itemsWithout;
    }

    const totalProfit = totalSales - totalCmv;
    const grossMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    const pendingOrders = filteredOrdersList.filter(o => {
        const status = o?.status;
        return status === 'scheduled' || status === 'draft';
    }).length;

    const activeSchedules = filteredOrdersList.filter(o =>
        o && o.status === 'scheduled' && o.shipping?.scheduling?.date
    ).length;

    const totalKmDriven = saleOrders.reduce((acc, curr) => {
        const rawDist = curr?.shipping?.distance;
        const dist = typeof rawDist === 'number' ? rawDist : (parseFloat(String(rawDist || 0).replace(',', '.')) || 0);
        return acc + dist;
    }, 0);

    return { totalSales, saleCount, totalOrdersCount, totalProfit, grossMargin, totalCmv, avgTicket, pendingOrders, activeSchedules, totalKmDriven };
}

async function run() {
    console.log('=== MEDINDO FETCH ATUAL COMPLETO DO DASHBOARD ===');
    const start = performance.now();
    let from = 0;
    const pageSize = 1000;
    const rows = [];
    while (true) {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*), order_payments(*)')
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);
        if (error) throw error;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
    }
    const elapsed = performance.now() - start;
    const rawBytes = new TextEncoder().encode(JSON.stringify(rows)).byteLength;
    console.log(`Linhas retornadas: ${rows.length}`);
    console.log(`Tamanho do payload JSON: ${(rawBytes / 1024).toFixed(2)} KB (${(rawBytes / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`Tempo de resposta: ${elapsed.toFixed(0)} ms`);

    // Map to Order domain objects (simplified as in mapper)
    const orders = rows.map(r => {
        const rawLegacy = (r.order_data && typeof r.order_data === 'object') ? r.order_data : {};
        return {
            id: r.id,
            status: r.status || rawLegacy.status,
            orderType: r.order_type || rawLegacy.orderType || rawLegacy.order_type || 'sale',
            totalAmount: Number(r.total_amount ?? rawLegacy.totalAmount ?? 0),
            date: r.created_at || rawLegacy.date,
            marketingOrigin: r.marketing_origin || rawLegacy.marketingOrigin,
            deleted: r.deleted ?? rawLegacy.deleted ?? false,
            shipping: rawLegacy.shipping || { distance: 0, scheduling: { date: r.scheduled_date } },
            items: (r.order_items && r.order_items.length > 0) 
                ? r.order_items.map(it => ({
                    productId: it.product_id,
                    variationId: it.variation_id,
                    quantity: Number(it.quantity || 1),
                    unitPrice: Number(it.unit_price || 0),
                    unitDiscount: Number(it.discount || 0),
                    unitCost: it.unit_cost != null ? Number(it.unit_cost) : (it.cost_price != null ? Number(it.cost_price) : null),
                    costPrice: it.cost_price != null ? Number(it.cost_price) : null,
                    description: it.product_name,
                    handlingType: it.handling_type
                }))
                : (rawLegacy.items || [])
        };
    });

    for (const p of ['month', 'today', 'year']) {
        const { current, prev } = getIntervals(p);
        const filtered = orders.filter(o => {
            if (o.deleted) return false;
            const d = parsePTBRDate(o.date);
            return d && isWithinInterval(d, { start: current.start, end: current.end });
        });
        const prevFiltered = orders.filter(o => {
            if (o.deleted) return false;
            const d = parsePTBRDate(o.date);
            return d && isWithinInterval(d, { start: prev.start, end: prev.end });
        });
        const stats = calculateStats(filtered);
        const prevStats = calculateStats(prevFiltered);
        console.log(`\n--- RESULTADOS ATUAIS PARA PERÍODO: ${p.toUpperCase()} ---`);
        console.log(`Pedidos no período: ${filtered.length} (anterior: ${prevFiltered.length})`);
        console.log(`Total Vendas: R$ ${stats.totalSales.toFixed(2)} | Qtd Vendas: ${stats.saleCount}`);
        console.log(`Lucro: R$ ${stats.totalProfit.toFixed(2)} | Margem: ${stats.grossMargin.toFixed(1)}% | CMV: R$ ${stats.totalCmv.toFixed(2)}`);
        console.log(`Ticket Médio: R$ ${stats.avgTicket.toFixed(2)} | Pedidos Pendentes: ${stats.pendingOrders}`);
    }
}

run().catch(console.error);
