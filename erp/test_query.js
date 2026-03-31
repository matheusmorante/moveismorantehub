const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabase = createClient('https://wzpdfmihnwcrgkyagwkd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

async function testQuery() {
    const id = "1000660";
    console.log(`Testing query for product ${id}...`);
    
    // Test 1: Standard contains
    const { data: d1, error: e1 } = await supabase.from('orders').select('id').contains('order_data', { items: [{ code: id }] }).limit(1);
    console.log("Test 1 (Standard):", d1 ? `Found #${d1[0]?.id}` : "Not found", e1 ? `Error: ${e1.message}` : "");

    // Test 2: Arrow path filter
    const { data: d2, error: e2 } = await supabase.from('orders').select('id').filter('order_data->items', 'cs', `[{"code":"${id}"}]`).limit(1);
    console.log("Test 2 (Arrow Path):", d2 ? `Found #${d2[0]?.id}` : "Not found", e2 ? `Error: ${e2.message}` : "");
}
testQuery();
