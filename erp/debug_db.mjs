import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('🔍 Mapeando colunas reais da tabela inventory_moves via RPC SQL...');
    
    // Como a tabela está vazia e o select * falhou em mostrar colunas no log anterior,
    // vamos tentar um dML (insert) de teste com um objeto vazio para ver o erro detalhado do PG
    // OU usar a query de sistema se o usuário tiver permissão.
    
    const { error } = await supabase
        .from('inventory_moves')
        .insert([{}]);

    if (error) {
        console.log('Mensagem de erro do Supabase:', error.message);
        console.log('Detalhes:', error.details);
        console.log('Dica:', error.hint);
    }
}

run();
