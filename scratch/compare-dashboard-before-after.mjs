process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { isSameDay, subDays, differenceInCalendarDays, startOfDay, endOfDay, subMonths, isWithinInterval } from '../erp/node_modules/date-fns/index.js';

dotenv.config({ path: 'erp/.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, minute, second);
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
    const pendingOrders = filteredOrdersList.filter(o => o.status === 'scheduled' || o.status === 'draft').length;

    return { totalSales, saleCount, totalOrdersCount, totalProfit, grossMargin, totalCmv, avgTicket, pendingOrders };
}

async function fetchBefore() {
    let from = 0;
    const pageSize = 1000;
    const rows = [];
    while (true) {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*), order_payments(*)')
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);
        if (error) {
            console.error('fetchBefore error:', error);
            break;
        }
        if (data) rows.push(...data);
        if (!data || data.length < pageSize) break;
        from += pageSize;
    }
    const bytes = new TextEncoder().encode(JSON.stringify(rows)).byteLength;
    const orders = rows.map(r => ({
        id: r.id,
        status: r.status,
        orderType: r.order_type || 'sale',
        totalAmount: Number(r.total_amount ?? 0),
        date: r.created_at,
        deleted: r.deleted ?? false,
        items: (r.order_items || []).map(it => ({
            productId: it.product_id,
            variationId: it.variation_id,
            quantity: Number(it.quantity || 1),
            unitPrice: Number(it.unit_price || 0),
            unitDiscount: Number(it.unit_discount || 0),
            unitCost: it.cost_price != null ? Number(it.cost_price) : null,
            costPrice: it.cost_price != null ? Number(it.cost_price) : null,
            description: it.description,
            isTemporaryProduct: it.is_temporary_product
        }))
    }));
    return { orders, bytes, count: rows.length };
}

async function fetchAfter(period) {
    const { current, prev } = getIntervals(period);
    const range = { start: prev.start, end: current.end };

    const DASHBOARD_ORDERS_COLUMNS = `
        id, order_number, order_index, status, order_type, customer_id, customer_name,
        seller_id, seller_name, total_amount, payment_method,
        channel, notes, scheduled_date, scheduled_start_time, scheduled_end_time,
        delivery_method, delivery_status, delivery_arrived_at, delivery_started_at, delivery_finished_at,
        marketing_origin, items_subtotal, total_discount, total_cost, stock_processed,
        is_stock_checked, is_registered_in_bling, deleted, deleted_at, return_order_id,
        linked_order_id, returned_total_amount, original_sold_total, return_kind,
        created_at, updated_at,
        order_items(id, order_id, item_index, product_id, variation_id, code, description, quantity, unit_price, unit_discount, cost_price, handling_type, is_temporary_product)
    `;

    // 1. Pedidos do período (corrente + anterior)
    const { data: periodRows } = await supabase
        .from('orders')
        .select(DASHBOARD_ORDERS_COLUMNS)
        .gte('created_at', range.start.toISOString())
        .lte('created_at', range.end.toISOString())
        .order('created_at', { ascending: false });

    // 2. Pedidos agendados em aberto (para painel operacional)
    const { data: scheduledRows } = await supabase
        .from('orders')
        .select(DASHBOARD_ORDERS_COLUMNS)
        .or('deleted.is.null,deleted.eq.false')
        .in('status', ['scheduled', 'draft'])
        .order('created_at', { ascending: false });

    const totalBytes = new TextEncoder().encode(JSON.stringify(periodRows)).byteLength +
                       new TextEncoder().encode(JSON.stringify(scheduledRows)).byteLength;

    const map = new Map();
    [...(periodRows || []), ...(scheduledRows || [])].forEach(r => {
        if (r && r.id && !map.has(String(r.id))) {
            map.set(String(r.id), {
                id: r.id,
                status: r.status,
                orderType: r.order_type || 'sale',
                totalAmount: Number(r.total_amount ?? 0),
                date: r.created_at,
                deleted: r.deleted ?? false,
                items: (r.order_items || []).map(it => ({
                    productId: it.product_id,
                    variationId: it.variation_id,
                    quantity: Number(it.quantity || 1),
                    unitPrice: Number(it.unit_price || 0),
                    unitDiscount: Number(it.unit_discount || 0),
                    unitCost: it.cost_price != null ? Number(it.cost_price) : null,
                    costPrice: it.cost_price != null ? Number(it.cost_price) : null,
                    description: it.description,
                    isTemporaryProduct: it.is_temporary_product
                }))
            });
        }
    });

    return { orders: Array.from(map.values()), bytes: totalBytes, count: (periodRows?.length || 0) + (scheduledRows?.length || 0) };
}

async function run() {
    console.log('Obtendo baseline (Antes)...');
    const beforeData = await fetchBefore();

    for (const p of ['today', 'month', 'year']) {
        const { current } = getIntervals(p);
        const filteredBefore = beforeData.orders.filter(o => {
            if (o.deleted) return false;
            const d = parsePTBRDate(o.date);
            return d && isWithinInterval(d, { start: current.start, end: current.end });
        });
        const statsBefore = calculateStats(filteredBefore);

        const afterData = await fetchAfter(p);
        const filteredAfter = afterData.orders.filter(o => {
            if (o.deleted) return false;
            const d = parsePTBRDate(o.date);
            return d && isWithinInterval(d, { start: current.start, end: current.end });
        });
        const statsAfter = calculateStats(filteredAfter);

        console.log(`\n=================== PERÍODO: ${p.toUpperCase()} ===================`);
        console.log(`ANTES:  Linhas: ${beforeData.count} | Payload: ${(beforeData.bytes / 1024).toFixed(2)} KB`);
        console.log(`DEPOIS: Linhas: ${afterData.count} | Payload: ${(afterData.bytes / 1024).toFixed(2)} KB | Redução: ${(100 - (afterData.bytes / beforeData.bytes * 100)).toFixed(1)}%`);
        console.log(`KPIs ANTES:  Total: R$ ${statsBefore.totalSales.toFixed(2)} | Qtd: ${statsBefore.saleCount} | Lucro: R$ ${statsBefore.totalProfit.toFixed(2)} | Ticket: R$ ${statsBefore.avgTicket.toFixed(2)}`);
        console.log(`KPIs DEPOIS: Total: R$ ${statsAfter.totalSales.toFixed(2)} | Qtd: ${statsAfter.saleCount} | Lucro: R$ ${statsAfter.totalProfit.toFixed(2)} | Ticket: R$ ${statsAfter.avgTicket.toFixed(2)}`);
        
        const identical = (
            statsBefore.totalSales.toFixed(2) === statsAfter.totalSales.toFixed(2) &&
            statsBefore.saleCount === statsAfter.saleCount &&
            statsBefore.totalProfit.toFixed(2) === statsAfter.totalProfit.toFixed(2) &&
            statsBefore.avgTicket.toFixed(2) === statsAfter.avgTicket.toFixed(2)
        );
        console.log(`>>> PARIDADE DOS NÚMEROS: ${identical ? '100% IDÊNTICO ✓' : 'DIVERGÊNCIA ✗'} <<<`);
    }
}

run().catch(console.error);
