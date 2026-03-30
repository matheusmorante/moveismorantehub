import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('🔍 Tentativa agressiva de listar colunas de inventory_moves...');
    
    // Tentamos fazer um SELECT de colunas uma a uma para ver qual falha
    const columnsToTest = [
        'product_id', 
        'variation_id', 
        'product_description', 
        'type', 
        'quantity', 
        'date', 
        'label', 
        'unit_cost', 
        'related_entity_id', 
        'related_entity_type', 
        'observation', 
        'status', 
        'created_at'
    ];

    for (const col of columnsToTest) {
        const { error } = await supabase
            .from('inventory_moves')
            .select(col)
            .limit(1);
        
        if (error) {
            console.log(`❌ Coluna [${col}] NAO encontrada:`, error.message);
        } else {
            console.log(`✅ Coluna [${col}] OK.`);
        }
    }
}

run();
