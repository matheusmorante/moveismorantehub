import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', 1730)
        .single();
    
    if (error) {
        console.error('Erro ao buscar pedido:', error.message);
        return;
    }

    const orderData = order.order_data || {};
    console.log('--- Informações do Pedido 1730 ---');
    console.log('ID:', order.id);
    console.log('Status (top):', order.status);
    console.log('Status (data):', orderData.status);
    console.log('Order Type (top):', order.orderType);
    console.log('Order Type (data):', orderData.orderType);
    console.log('Stock Processed:', orderData.stockProcessed);
    console.log('Items Count:', orderData.items?.length);
    console.log('Items Detail:', JSON.stringify(orderData.items, null, 2));
    console.log('----------------------------------');
}

run();
