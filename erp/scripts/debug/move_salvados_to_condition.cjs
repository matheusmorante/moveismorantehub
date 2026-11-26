const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wzpdfmihnwcrgkyagwkd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

asyncFunction();

async function asyncFunction() {
    const { data: prods } = await supabase.from('products').select('id, category');

    for (let p of prods) {
        if (!p.category) continue;

        let shouldUpdate = false;
        let pCatStr = p.category;

        if (pCatStr.includes('SALVADOS')) {
            pCatStr = pCatStr.replace('SALVADOS >> ', '').replace('SALVADOS', '').trim();
            if (pCatStr.startsWith('>> ')) pCatStr = pCatStr.replace('>> ', ''); // just in case

            await supabase.from('products').update({ condition: 'salvado', category: pCatStr }).eq('id', p.id);
        } else {
            // Se nao tem salvados na categoria ou descricao, podemos pular, ou botar condition = 'novo'
            await supabase.from('products').update({ condition: 'novo' }).eq('id', p.id);
        }
    }

    // Agora pra ter certeza que todo mundo tem uma condicao:
    await supabase.from('products').update({ condition: 'novo' }).is('condition', null);

    console.log("Updated conditions!");
    process.exit(0);
}
