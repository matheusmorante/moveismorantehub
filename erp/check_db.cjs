const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const result = dotenv.config();

console.log('--- Diagnóstico de Ambiente ---');
if (result.error) {
    console.error('Erro ao carregar .env:', result.error);
} else {
    console.log('.env carregado com sucesso');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL configurada:', !!supabaseUrl);
console.log('Supabase Key configurada:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('ERRO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Listando Produtos ---');
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, description, code, condition, variations')
            .eq('deleted', false);

        if (error) {
            console.error('Erro na query:', error);
            return;
        }

        if (!data || data.length === 0) {
            console.log('Nenhum produto encontrado.');
            return;
        }

        console.log(`Total de produtos no DB: ${data.length}`);

        const filtered = data.filter(p => {
            const desc = (p.description || '').toUpperCase();
            return desc.includes('G ROUPA') || 
                   desc.includes('COR:') || 
                   desc.includes('GUARDA ROUPA') || 
                   desc.includes('COZINHA COMPACTA JULIE') ||
                   desc.includes('COLCHÃO') ||
                   desc.includes('BALCÃO') ||
                   desc.includes('ARMÁRIO') ||
                   desc.includes('BANCADA') ||
                   desc.includes('TRAVESSEIRO') ||
                   desc.includes('TORRE KIT') ||
                   desc.includes('CÔMODA') ||
                   desc.includes('BASE BOX');
        });

        console.log(`Produtos filtrados para análise: ${filtered.length}`);

        const output = {
            timestamp: new Date().toISOString(),
            count: filtered.length,
            products: filtered
        };

        fs.writeFileSync('db_report.json', JSON.stringify(output, null, 2));
        console.log('Relatório salvo em db_report.json');
    } catch (e) {
        console.error('Exceção capturada:', e);
    }
}

check();
