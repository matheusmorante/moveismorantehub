import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient('https://wzpdfmihnwcrgkyagwkd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

async function test() {
    let out = "";
    const id = "16463803735";
    
    // Teste 1: Contém padrão
    try {
        const { data, error } = await supabase.from('orders').select('id').contains('order_data', { items: [{ productId: id }] }).limit(1);
        out += `Test 1: ${JSON.stringify({ data, error })}\n`;
    } catch (e) { out += `Test 1 Error: ${e.message}\n`; }

    // Teste 2: Filtro manual escapado
    try {
        const { data, error } = await supabase.from('orders').select('id').filter('order_data', 'cs', '"{\\"items\\": [{\\"productId\\": \\"'+id+'\\"}]}"').limit(1);
        out += `Test 2: ${JSON.stringify({ data, error })}\n`;
    } catch (e) { out += `Test 2 Error: ${e.message}\n`; }

    // Teste 3: Filtro manual SEM aspas duplas externas
    try {
        const { data, error } = await supabase.from('orders').select('id').filter('order_data', 'cs', '{"items": [{"productId": "'+id+'"}]}').limit(1);
        out += `Test 3: ${JSON.stringify({ data, error })}\n`;
    } catch (e) { out += `Test 3 Error: ${e.message}\n`; }

    fs.writeFileSync('./test_results.txt', out);
}
test();
