import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function force1404() {
    const { data: orders } = await supabase.from('orders').select('*').filter('order_data->>orderIndex', 'eq', '1404');
    if (!orders?.[0]) return;

    let orderData = orders[0].order_data;
    console.log('Status antes:', orderData.status);
    
    orderData.status = 'fulfilled';
    orderData.stockProcessed = true;
    
    const { error } = await supabase.from('orders').update({ 
        order_data: orderData,
        updated_at: new Date().toISOString()
    }).eq('id', orders[0].id);

    if (error) console.error('Erro:', error.message);
    else console.log('Sucesso!');
}

force1404().catch(console.error);
