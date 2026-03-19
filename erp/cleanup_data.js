
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    // Range of the import block I saw: around 00:23:00 to 00:23:30 (approx)
    // I'll use a wider but safe range for today: all created after 2026-03-19 00:00:00
    // and before 2026-03-19 01:00:00 (assuming it was one big import)
    
    console.log('Buscando clientes criados hoje...');
    const { data: recent, error: fetchError } = await supabase
        .from('people')
        .select('id, full_name, created_at')
        .eq('person_type', 'customers')
        .gte('created_at', '2026-03-19T00:00:00Z')
        .lte('created_at', '2026-03-19T02:00:00Z');

    if (fetchError) {
        console.error('Erro ao buscar:', fetchError);
        return;
    }

    if (!recent || recent.length === 0) {
        console.log('Nenhum cliente recente encontrado nesse intervalo.');
        return;
    }

    console.log(`Encontrados ${recent.length} clientes para remoção.`);
    
    // Deleting in chunks of 50
    for (let i = 0; i < recent.length; i += 50) {
        const chunk = recent.slice(i, i + 50);
        const ids = chunk.map(p => p.id);
        
        const { error: deleteError } = await supabase
            .from('people')
            .delete()
            .in('id', ids);
            
        if (deleteError) {
            console.error(`Erro ao deletar lote ${i}:`, deleteError);
        } else {
            console.log(`Lote ${i/50 + 1} deletado (${chunk.length} itens).`);
        }
    }
    
    console.log('Limpeza concluída!');
}

cleanup();
