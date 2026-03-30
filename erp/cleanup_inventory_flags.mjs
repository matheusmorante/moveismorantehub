import { createClient } from '@supabase/supabase-js';

// Configuração direta para execução em ambiente Node
const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('🚀 Iniciando script de limpeza de flags de estoque na tabela ORDERS (Correção ID)...');
    
    try {
        const { data: orders, error: fetchError } = await supabase
            .from('orders')
            .select('id, order_data');

        if (fetchError) throw fetchError;

        console.log(`📦 Analisando ${orders.length} pedidos...`);

        let fixedCount = 0;
        let skippedCount = 0;

        for (const order of orders) {
            const orderData = order.order_data || {};
            
            if (orderData.stockProcessed === true) {
                const items = orderData.items || [];
                const hasCatalogProducts = items.some(item => item.productId && String(item.productId).trim() !== "");
                
                if (!hasCatalogProducts) {
                    const idStr = String(order.id);
                    console.log(`⚠️  Pedido #${idStr.slice(-6)}: Corrigindo (Somente itens manuais)...`);
                    
                    const updatedData = { ...orderData, stockProcessed: false };
                    const { error: updateError } = await supabase
                        .from('orders')
                        .update({ order_data: updatedData })
                        .eq('id', order.id);
                    
                    if (updateError) {
                        console.error(`❌ Erro ao atualizar pedido ${order.id}:`, updateError.message);
                    } else {
                        fixedCount++;
                    }
                } else {
                    skippedCount++;
                }
            }
        }

        console.log('\n--- Resultado Final ---');
        console.log(`✅ Pedidos corrigidos (desmarcados): ${fixedCount}`);
        console.log(`ℹ️  Pedidos mantidos (com produtos reais): ${skippedCount}`);
        console.log('------------------------\n');

    } catch (err) {
        console.error('💥 Erro fatal:', err.message);
    }
}

run();
