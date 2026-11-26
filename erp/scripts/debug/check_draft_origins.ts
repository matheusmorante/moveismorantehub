import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDrafts() {
    const { data: orders } = await supabase.from('orders').select('order_data');
    const draftOrigins = new Map();

    for (const order of orders || []) {
        if (order.order_data?.status === 'draft') {
            const origin = order.order_data?.marketingOrigin || 'outro';
            draftOrigins.set(origin, (draftOrigins.get(origin) || 0) + 1);
        }
    }
    console.log('Origens dos Drafts:', Object.fromEntries(draftOrigins));
}

checkDrafts().catch(console.error);
