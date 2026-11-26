const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wzpdfmihnwcrgkyagwkd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

async function run() {
    // 1. Check or Create "SALA DE JANTAR" group
    let { data: groups } = await supabase.from('category_groups').select('*').ilike('name', 'SALA DE JANTAR');
    let group = groups?.[0];
    if (!group) {
        const { data: newG } = await supabase.from('category_groups').insert([{ name: 'SALA DE JANTAR' }]).select();
        group = newG[0];
        console.log("Created SALA DE JANTAR group");
    }

    // 2. Check or Create "MESA" category
    let { data: cats } = await supabase.from('categories').select('*').ilike('name', 'MESA');
    let cat = cats?.[0];
    if (!cat) {
        const { data: newC } = await supabase.from('categories').insert([{ name: 'MESA', active: true }]).select();
        cat = newC[0];
        console.log("Created MESA category");
    }

    // 3. Link them
    await supabase.from('category_group_links').upsert([{ group_id: group.id, category_id: cat.id }], { onConflict: 'group_id,category_id' });
    console.log("Linked MESA to SALA DE JANTAR");

    // 4. Find all mesas without cadeiras
    const { data: prods } = await supabase.from('products').select('id, description');

    let count = 0;
    for (let p of prods) {
        let desc = p.description.toLowerCase();

        // Match word "mesa", "base", "tampo", or "sal jantar"
        let isMesa = /\b(mesa|base|tampo)\b/i.test(desc) || /sal\s?jantar/i.test(desc);

        // Should NOT have "cad", "cadeira", "conjunto", "conj", "centro", "escritorio", "office", "cabeceira", "apoi"
        let isNotConjunto = !/\b(cad|cadeira|cadeiras|conjunto|conj)\b/i.test(desc);
        let isNotOtherType = !/\b(centro|escrit[oó]rio|office|cabeceira|apoio|telefone|gamer)\b/i.test(desc);

        if (isMesa && isNotConjunto && isNotOtherType) {
            await supabase.from('products').update({ category: 'MESA' }).eq('id', p.id);
            await supabase.from('product_categories').delete().eq('product_id', p.id);
            await supabase.from('product_categories').insert([{ product_id: p.id, category_id: cat.id }]);
            console.log("-> MESA: " + p.description);
            count++;
        }
    }

    console.log("Updated " + count + " products to category MESA");
    process.exit(0);
}

run();
