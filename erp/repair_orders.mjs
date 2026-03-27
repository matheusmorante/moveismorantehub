import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: orders } = await supabase.from('orders').select('id, shipping, customerData, status').neq('status', 'draft');
    if (!orders) {
        console.log("No orders found");
        return;
    }
    
    let count = 0;
    for (const order of orders) {
        const addr = order.shipping?.useCustomerAddress === false && order.shipping?.deliveryAddress 
            ? order.shipping.deliveryAddress 
            : order.customerData?.fullAddress;
            
        if (addr && addr.street && addr.street.toLowerCase().includes('stoco')) {
            console.log('Found Stoco order:', order.id);
            if (order.shipping) {
                order.shipping.destinationCoords = null; 
                order.shipping.routeGeoJSON = null; // Clear old bad line
                await supabase.from('orders').update({ shipping: order.shipping }).eq('id', order.id);
                count++;
            }
        }
    }
    console.log('Fixed', count, 'orders');
}
run();
