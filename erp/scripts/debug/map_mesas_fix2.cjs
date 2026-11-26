const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wzpdfmihnwcrgkyagwkd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

async function run() {
    let { data: groups } = await supabase.from('category_groups').select('*').ilike('name', 'SALA DE JANTAR');
    let group = groups[0];
    if (!group) {
        let res = await supabase.from('category_groups').insert([{ name: 'SALA DE JANTAR' }]).select();
        group = res.data[0];
    }

    let { data: mcats } = await supabase.from('categories').select('*').ilike('name', 'MESA DE JANTAR');
    let catMesaJantar = mcats?.[0];
    if (!catMesaJantar) {
        let res = await supabase.from('categories').insert([{ name: 'MESA DE JANTAR', active: true }]).select();
        catMesaJantar = res.data[0];
        await supabase.from('category_group_links').insert([{ group_id: group.id, category_id: catMesaJantar.id }]);
    }

    let { data: catsMesa } = await supabase.from('categories').select('*').ilike('name', 'MESA');
    let catMesa = catsMesa?.[0];
    if (!catMesa) {
        let res = await supabase.from('categories').insert([{ name: 'MESA', active: true }]).select();
        catMesa = res.data[0];
        await supabase.from('category_group_links').insert([{ group_id: group.id, category_id: catMesa.id }]);
    }

    // reset categories for previously misidentified products
    const { data: misidentified } = await supabase.from('products').select('id').eq('category', 'MESA');
    if (misidentified) {
        for (let p of misidentified) {
            await supabase.from('products').update({ category: null }).eq('id', p.id);
            await supabase.from('product_categories').delete().eq('product_id', p.id);
        }
    }

    // Categorize correctly
    const { data: allProds } = await supabase.from('products').select('id, description');

    let countMesa = 0;
    let countConjuntos = 0;

    for (let p of allProds) {
        let desc = p.description.toLowerCase();

        let hasMesa = /\b(mesa|base de mesa|tampo de vidro|tampo de mesa|base majestic)\b/i.test(desc) || (/sal\s?jantar/i.test(desc) && !/conj|cj/i.test(desc));
        let isNotConjunto = !/(cad|cadeira|cadeiras|conj|cj|banqueta|banque|poltrona)/i.test(desc);
        let isNotOther = !/(centro|escrit|office|cabeceira|apoio|telefone|gamer|box|balcao|balcão|cook|cozinha)/i.test(desc);

        let isConjuntoJantar = /\bmesa\b/i.test(desc) && /(cad|cadeira|cadeiras|conj|cj|banq)/i.test(desc) && !/(centro|escrit|box|balcao)/i.test(desc);

        if (hasMesa && isNotConjunto && isNotOther) {
            await supabase.from('products').update({ category: 'MESA' }).eq('id', p.id);
            await supabase.from('product_categories').delete().eq('product_id', p.id);
            await supabase.from('product_categories').insert([{ product_id: p.id, category_id: catMesa.id }]);
            countMesa++;
        } else if (isConjuntoJantar) {
            await supabase.from('products').update({ category: 'MESA DE JANTAR' }).eq('id', p.id);
            await supabase.from('product_categories').delete().eq('product_id', p.id);
            await supabase.from('product_categories').insert([{ product_id: p.id, category_id: catMesaJantar.id }]);
            countConjuntos++;
        }
    }

    console.log(`Finished! Mesas: ${countMesa}, Mesa de Jantar (conjuntos): ${countConjuntos}`);
    process.exit(0);
}

run();
