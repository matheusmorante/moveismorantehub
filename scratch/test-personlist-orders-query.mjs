import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'erp/.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('=== TESTANDO QUERY DE CONTAGEM DE CLIENTES EM PERSONLIST ===');
    
    // 1. Query Atual (com order_data)
    const start1 = performance.now();
    const { data: dataWithOrderData } = await supabase
        .from('orders')
        .select('id, deleted, customer_id, customer_name, customer_phone, customer_email, order_data')
        .eq('deleted', false);
    const bytes1 = new TextEncoder().encode(JSON.stringify(dataWithOrderData)).byteLength;
    const time1 = performance.now() - start1;

    // 2. Query Otimizada (sem order_data)
    const start2 = performance.now();
    const { data: dataWithoutOrderData } = await supabase
        .from('orders')
        .select('id, deleted, customer_id, customer_name, customer_phone, customer_email')
        .eq('deleted', false);
    const bytes2 = new TextEncoder().encode(JSON.stringify(dataWithoutOrderData)).byteLength;
    const time2 = performance.now() - start2;

    console.log(`Antes (com order_data): ${(bytes1 / 1024).toFixed(2)} KB em ${time1.toFixed(0)} ms`);
    console.log(`Depois (sem order_data): ${(bytes2 / 1024).toFixed(2)} KB em ${time2.toFixed(0)} ms`);
    console.log(`Economia: ${(100 - (bytes2 / bytes1 * 100)).toFixed(1)}%`);

    // Validar se contagens usando customer_id, customer_name, customer_phone, customer_email batem
    let matched = 0;
    let fallbackNeeded = 0;
    for (const row of dataWithOrderData) {
        if (row.customer_id || row.customer_name || row.customer_phone || row.customer_email) {
            matched++;
        } else {
            fallbackNeeded++;
        }
    }
    console.log(`Total pedidos: ${dataWithOrderData.length}, com colunas estruturadas: ${matched}, precisando fallback em order_data: ${fallbackNeeded}`);
}

run().catch(console.error);
