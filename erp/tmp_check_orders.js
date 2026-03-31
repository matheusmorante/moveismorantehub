const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabase = createClient('https://wzpdfmihnwcrgkyagwkd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

console.log("Checking orders...");
async function check() {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, order_data')
            .eq('deleted', false)
            .limit(10);
            
        if (error) console.error("DB Error:", error);
        if (orders) {
            console.log(`Found ${orders.length} orders`);
            orders.forEach(o => {
                const type = o.order_data?.orderType;
                if (type === 'budget') return;
                console.log(`Order #${o.id} - Type: ${type}`);
                const items = o.order_data?.items || [];
                items.forEach(i => {
                    console.log(` - Product ID: ${i.productId}, Name: ${i.description}, Code: ${i.code}`);
                });
            });
        }
    } catch (e) {
        console.error("Script Error:", e);
    }
}
check();
