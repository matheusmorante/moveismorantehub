
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addCategories() {
    const catsToAdd = [
        { name: 'Embalagens e Insumos', type: 'expense' },
        { name: 'Internet e Telefone', type: 'expense' },
        { name: 'Combustível e Manutenção', type: 'expense' },
        { name: 'Material de Escritório', type: 'expense' },
        { name: 'Limpeza e Conservação', type: 'expense' },
        { name: 'Taxas Bancárias', type: 'expense' },
        { name: 'Outras Receitas', type: 'income' },
        { name: 'Outras Despesas', type: 'expense' },
        { name: 'Fretes e Entregas', type: 'expense' },
        { name: 'Ferramentas e Peças', type: 'expense' },
        { name: 'Seguros e Impostos', type: 'expense' }
    ];

    console.log('Tentando adicionar categorias...');
    const { data, error } = await supabase.from('financial_categories').insert(catsToAdd).select();
    
    if (error) {
        console.error('Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Categorias adicionadas com sucesso!');
    }
}

addCategories();
