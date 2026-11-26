import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAll() {
    let hasMore = true;
    let offset = 0;
    const pageSize = 1000;
    const statusCounts = new Map();
    const originCounts = new Map();

    while (hasMore) {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('order_data')
            .range(offset, offset + pageSize - 1);

        if (error || !orders || orders.length === 0) break;

        for (const order of orders) {
            const od = order.order_data;
            const status = String(od?.status || 'sem_status');
            const origin = String(od?.marketingOrigin || 'outro/sistema');
            
            statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
            originCounts.set(origin, (originCounts.get(origin) || 0) + 1);
        }
        
        if (orders.length < pageSize) hasMore = false;
        else offset += pageSize;
    }

    console.log('Status Totais:', Object.fromEntries(statusCounts));
    console.log('Origens Totais:', Object.fromEntries(originCounts));
}

checkAll().catch(console.error);
