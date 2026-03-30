import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('🔍 Buscando colunas da tabela inventory_moves...');
    
    // Lista 1 registro sem single() para evitar o erro de coerção
    const { data, error } = await supabase
        .from('inventory_moves')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('❌ Erro Supabase:', error.message);
    } else if (data && data.length > 0) {
        console.log('✅ Registro encontrado!');
        console.log('Colunas:', Object.keys(data[0]));
    } else {
        console.log('⚠️ Nenhum registro encontrado para listar colunas.');
    }
}

run();
