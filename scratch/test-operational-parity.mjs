import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { isSameDay, subDays, differenceInCalendarDays, startOfDay, endOfDay, subMonths, isWithinInterval } from '../erp/node_modules/date-fns/index.js';

dotenv.config({ path: 'erp/.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseScheduleDate(order) {
    const dateStr = order.shipping?.scheduling?.date;
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
}

function isToday(d) {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
}

function isPastDate(d) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d < today;
}

function computeOperational(allActiveOrders) {
    const nonDeleted = allActiveOrders.filter(o => !o.deleted);
    const openOrders = nonDeleted.filter(o =>
        o.status === 'scheduled' && o.orderType !== 'return' && o.orderType !== 'assistance'
    );
    const scheduledOrders = openOrders.filter(o => !!o.shipping?.scheduling?.date);
    const deliveriesToday = scheduledOrders.filter(o => {
        const d = parseScheduleDate(o); return d ? isToday(d) : false;
    });
    const lateDeliveries = scheduledOrders.filter(o => {
        const d = parseScheduleDate(o); return d ? isPastDate(d) : false;
    });
    const pendingAssemblies = nonDeleted.filter(o =>
        o.status === 'scheduled' && (o.items || []).some(item => item.handlingType === 'montagem')
    );
    return {
        openOrdersCount: openOrders.length,
        scheduledOrdersCount: scheduledOrders.length,
        deliveriesTodayCount: deliveriesToday.length,
        lateDeliveriesCount: lateDeliveries.length,
        pendingAssembliesCount: pendingAssemblies.length
    };
}

async function run() {
    // 1. Baseline com todos os 894 pedidos
    const { data: allRows } = await supabase
        .from('orders')
        .select('id, status, order_type, scheduled_date, deleted, order_data, order_items(handling_type)')
        .or('deleted.is.null,deleted.eq.false');

    const mappedAll = allRows.map(r => ({
        id: r.id,
        status: r.status,
        orderType: r.order_type || 'sale',
        deleted: r.deleted ?? false,
        shipping: { scheduling: { date: r.scheduled_date || r.order_data?.shipping?.scheduling?.date } },
        items: r.order_items || []
    }));

    const baseOp = computeOperational(mappedAll);
    console.log('=== OPERACIONAL BASELINE (COM 894 PEDIDOS) ===');
    console.log(baseOp);

    // 2. Otimizado: buscando APENAS status = 'scheduled'
    const { data: scheduledRows } = await supabase
        .from('orders')
        .select('id, status, order_type, scheduled_date, deleted, order_items(handling_type)')
        .or('deleted.is.null,deleted.eq.false')
        .eq('status', 'scheduled');

    const mappedScheduled = scheduledRows.map(r => ({
        id: r.id,
        status: r.status,
        orderType: r.order_type || 'sale',
        deleted: r.deleted ?? false,
        shipping: { scheduling: { date: r.scheduled_date } },
        items: r.order_items || []
    }));

    const optOp = computeOperational(mappedScheduled);
    console.log('\n=== OPERACIONAL OTIMIZADO (APENAS STATUS = SCHEDULED) ===');
    console.log(optOp);
    console.log(`Registros buscados: ${scheduledRows.length} (vs 894 antes)`);
    console.log(`Paridade 100% idêntica: ${JSON.stringify(baseOp) === JSON.stringify(optOp)}`);
}

run().catch(console.error);
