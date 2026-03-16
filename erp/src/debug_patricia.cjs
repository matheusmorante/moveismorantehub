const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

console.log("Iniciando script de debug...");

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos.");
    process.exit(1);
}

console.log("Configurações carregadas. URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("Testando conexão...");
    const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, status')
        .limit(10);

    if (error) {
        console.error("Erro na conexão/query:", error);
        return;
    }

    console.log(`Sucesso! Encontrados ${data.length} pedidos.`);
    if (data.length > 0) {
        console.log("IDs recentes:", data.map(o => o.id).join(', '));
    }

    console.log("Buscando Patricia...");
    const { data: patriciaData, error: patriciaError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (patriciaError) {
        console.error("Erro ao buscar dados completos:", patriciaError);
        return;
    }

    const found = patriciaData.filter(o => {
        const name = o.order_data?.customerData?.fullName || "";
        return name.toLowerCase().includes("patricia") || name.toLowerCase().includes("fontes");
    });

    if (found.length === 0) {
        console.log("Nenhum pedido de Patricia encontrado nos últimos 50 registros.");
    } else {
        found.forEach(order => {
            console.log(`ID: ${order.id}`);
            console.log(`Status: ${order.status}`);
            console.log(`Cliente: ${order.order_data?.customerData?.fullName}`);
            console.log(`Data: ${order.created_at}`);
            console.log(`Items: ${JSON.stringify(order.order_data?.items?.map(i => i.description))}`);
            console.log("---");
        });
    }
}

testConnection();
