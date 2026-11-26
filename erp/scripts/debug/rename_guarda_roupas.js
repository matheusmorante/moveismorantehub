import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('--- RENAMING PRODUCTS (G -> Guarda-Roupa) ---');

    const { data: products, error } = await supabase
        .from('products')
        .select('id, description')
        .eq('deleted', false);

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    let count = 0;
    for (const p of products) {
        if (p.description && p.description.startsWith('G ')) {
            const newName = p.description.replace(/^G /, 'Guarda-Roupa ');
            console.log(`Renaming: "${p.description}" -> "${newName}"`);
            const { error: updateError } = await supabase
                .from('products')
                .update({ description: newName, updated_at: new Date().toISOString() })
                .eq('id', p.id);
            
            if (!updateError) count++;
            else console.error(`Error updating product ${p.id}:`, updateError);
        }
    }

    console.log(`--- FINISHED: ${count} products renamed ---`);
    process.exit(0);
}

run();
