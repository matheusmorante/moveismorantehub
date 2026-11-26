import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectPayments() {
    const { data: orders } = await supabase.from('orders').select('order_data').filter('order_data->>orderIndex', 'eq', '1208');
    if (orders) {
        console.log('Pagamentos do Pedido #1208:');
        console.log(JSON.stringify(orders[0].order_data.payments, null, 2));
    }
}

inspectPayments().catch(console.error);
