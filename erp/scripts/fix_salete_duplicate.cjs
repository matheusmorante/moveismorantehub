// Script para encontrar e remover pedido duplicado da Salete
// Executa: node scripts/fix_salete_duplicate.cjs

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
// Lê a chave do ambiente ou usa a service role key se disponível
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY || '';

if (!SUPABASE_KEY) {
    console.error('ERRO: Defina SUPABASE_SERVICE_KEY ou VITE_SUPABASE_KEY no ambiente.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('Buscando pedidos da Salete...');
    
    const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, created_at, order_data')
        .ilike('order_data->>customerData', '%salete%')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (error) {
        // Tentativa alternativa com filter
        const { data: data2, error: error2 } = await supabase
            .from('orders')
            .select('id, order_number, created_at')
            .order('created_at', { ascending: false })
            .limit(30);
        
        if (error2) {
            console.error('Erro ao buscar pedidos:', error2);
            return;
        }
        console.log('Pedidos recentes (últimos 30):');
        data2?.forEach(o => console.log(`  ID: ${o.id} | Nro: ${o.order_number} | Criado: ${o.created_at}`));
        return;
    }
    
    console.log(`\nEncontrados ${data?.length || 0} pedido(s) da Salete:\n`);
    data?.forEach(o => {
        const cd = o.order_data?.customerData;
        console.log(`  ID: ${o.id}`);
        console.log(`  Numero: ${o.order_number}`);
        console.log(`  Cliente: ${cd?.fullName}`);
        console.log(`  Status: ${o.order_data?.status}`);
        console.log(`  Criado: ${o.created_at}`);
        console.log('  ---');
    });
    
    if (!data || data.length < 2) {
        console.log('\nNao ha duplicatas para remover.');
        return;
    }
    
    // O mais recente é a duplicata (segundo pedido criado)
    const [maisRecente, ...anteriores] = data;
    console.log(`\nDuplicata identificada (mais recente):`);
    console.log(`  ID: ${maisRecente.id} | Nro: ${maisRecente.order_number} | Criado: ${maisRecente.created_at}`);
    console.log(`\nPedido original (a manter):`);
    anteriores.forEach(o => console.log(`  ID: ${o.id} | Nro: ${o.order_number} | Criado: ${o.created_at}`));
    
    // Soft delete na duplicata
    const { error: deleteError } = await supabase
        .from('orders')
        .update({
            order_data: {
                ...maisRecente.order_data,
                deleted: true,
                deletedAt: new Date().toISOString(),
                deletedReason: 'Pedido duplicado removido automaticamente - bug de double-submit corrigido em 08/09/2026'
            }
        })
        .eq('id', maisRecente.id);
    
    if (deleteError) {
        console.error('\nErro ao remover duplicata:', deleteError);
    } else {
        console.log(`\nDuplicata removida com sucesso! ID: ${maisRecente.id}`);
    }
}

main().catch(console.error);
