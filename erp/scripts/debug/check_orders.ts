import { supabase } from '../src/pages/utils/supabaseConfig';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    console.log('Fetching orders...');
    const { data, error } = await supabase.from('orders').select('order_data');
    if (error) {
        console.error(error);
        return;
    }
    const indexes = data.map(d => (d.order_data as any).orderIndex);
    fs.writeFileSync('temp_orders.json', JSON.stringify(indexes, null, 2));
    console.log('Saved orders to temp_orders.json');
}

run();
