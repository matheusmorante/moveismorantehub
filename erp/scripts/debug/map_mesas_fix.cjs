const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wzpdfmihnwcrgkyagwkd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

async function run() {
    let { data: groups } = await supabase.from('category_groups').select('*').ilike('name', 'SALA DE JANTAR');
    let group = groups[0];

    // Find "MESA DE JANTAR"
    let { data: mcats } = await supabase.from('categories').select('*').ilike('name', 'MESA DE JANTAR');
    let catMesaJantar = mcats[0];

    // Fix the mistakenly categorized MESA items
    const { data: prods } = await supabase.from('products').select('id, description').eq('category', 'MESA');

    // Also fetch all products again to ensure we catch all
    const { data: allProds } = await supabase.from('products').select('id, description');

    // First, restore categories of falsely flagged items. We will set their class to empty unless they fit something else.
    // Or we can just let an empty category string and delete product_categories
    for (let p of (prods || [])) {
        await supabase.from('products').update({ category: null }).eq('id', p.id);
        await supabase.from('product_categories').delete().eq('product_id', p.id);
    }

    // Now re-categorize carefully Mesas without Cadeiras
    let { data: cats } = await supabase.from('categories').select('*').ilike('name', 'MESA');
    let catMesa = cats[0];

    let count = 0;
    for (let p of allProds) {
        let desc = p.description.toLowerCase();

        let hasMesa = /\b(mesa|base de mesa|tampo de vidro|tampo de mesa)\b/i.test(desc);
        let isNotConjunto = !/(cad|cadeira|conj|cj|banqueta|banq|poltrona)/i.test(desc);
        let isNotOther = !/(centro|escrit|office|cabeceira|apoio|telefone|gamer|box|balcao|balcão|cook|cozinha)/i.test(desc);

        // Let's specifically catch Mesa de Jantar Com Cadeiras too, since we broke some
        let isConjuntoJantar = /\bmesa\b/i.test(desc) && /(cad|conj|cj|banq)/i.test(desc) && !/(centro|escrit|box|balcao)/i.test(desc);

        if (hasMesa && isNotConjunto && isNotOther) {
            await supabase.from('products').update({ category: 'MESA' }).eq('id', p.id);
            await supabase.from('product_categories').delete().eq('product_id', p.id);
            await supabase.from('product_categories').insert([{ product_id: p.id, category_id: catMesa.id }]);
            count++;
        } else if (isConjuntoJantar) {
            await supabase.from('products').update({ category: 'MESA DE JANTAR' }).eq('id', p.id);
            await supabase.from('product_categories').delete().eq('product_id', p.id);
            await supabase.from('product_categories').insert([{ product_id: p.id, category_id: catMesaJantar.id }]);
        }
    }

    console.log("Fixed mesas and conjuntos. " + count + " true MESAS found.");
    process.exit(0);
}

run();
