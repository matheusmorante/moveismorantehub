const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wzpdfmihnwcrgkyagwkd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

async function run() {
    // 1. Check or Create "COZINHA" group
    let { data: groups } = await supabase.from('category_groups').select('*').ilike('name', 'COZINHA');
    let groupCozinha = groups?.[0];
    if (!groupCozinha) {
        let res = await supabase.from('category_groups').insert([{ name: 'COZINHA' }]).select();
        groupCozinha = res.data[0];
        console.log("Created COZINHA group");
    }

    // 2. Check or Create "BALCÕES" category
    let { data: cats } = await supabase.from('categories').select('*').ilike('name', 'BALCÕES');
    let catBalcoes = cats?.[0];
    if (!catBalcoes) {
        let res = await supabase.from('categories').insert([{ name: 'BALCÕES', active: true }]).select();
        catBalcoes = res.data[0];
        console.log("Created BALCÕES category");
    }

    // 3. Link BALCÕES to COZINHA
    await supabase.from('category_group_links').upsert([{ group_id: groupCozinha.id, category_id: catBalcoes.id }], { onConflict: 'group_id,category_id' });
    console.log("Linked BALCÕES to COZINHA");

    // 4. Find all products that match:
    // "BALCÃO COM TAMPO", "APARADOR", "BALCOES PARA PIA"
    // So if it contains "balcão", "balcao", "aparador", "pia" 
    const { data: allProds } = await supabase.from('products').select('id, description');

    let count = 0;
    for (let p of allProds) {
        let desc = p.description.toLowerCase();

        // Find if description fits Balcões para Pia, Balcão com Tampo, Aparador or just Balcoes generally
        let isBalcaoOuAparador = /\b(balc[aã]o|balc[oõ]es|aparador|pia)\b/i.test(desc);

        // Exclude some things like "Mesa", "Roupeiro", "Cama" just in case they have "pia" ? 
        // Pia batismal? probably not
        let isNotOtherCategory = !/\b(cama|roupeiro|guarda roupa|sof[aá]|mesa|cadeira|colch[aã]o)\b/i.test(desc);

        if (isBalcaoOuAparador && isNotOtherCategory) {
            await supabase.from('products').update({ category: 'BALCÕES' }).eq('id', p.id);
            await supabase.from('product_categories').delete().eq('product_id', p.id); // clear old category links
            await supabase.from('product_categories').insert([{ product_id: p.id, category_id: catBalcoes.id }]);
            count++;
        }
    }

    console.log("Updated " + count + " true BALCÕES/APARADORES items to category BALCÕES linked to COZINHA");
    process.exit(0);
}

run();
