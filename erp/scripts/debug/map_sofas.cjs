const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wzpdfmihnwcrgkyagwkd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

async function run() {
    // 1. Check or Create "SALA DE ESTAR" group
    let { data: groups } = await supabase.from('category_groups').select('*').ilike('name', 'SALA DE ESTAR');
    let group = groups?.[0];
    if (!group) {
        const { data: newG } = await supabase.from('category_groups').insert([{ name: 'SALA DE ESTAR' }]).select();
        group = newG[0];
        console.log("Created SALA DE ESTAR group");
    }

    // 2. Check or Create "SOFÁS" category
    let { data: cats } = await supabase.from('categories').select('*').ilike('name', 'SOFÁS');
    let cat = cats?.[0];
    if (!cat) {
        const { data: newC } = await supabase.from('categories').insert([{ name: 'SOFÁS', active: true }]).select();
        cat = newC[0];
        console.log("Created SOFÁS category");
    }

    // 3. Link them
    await supabase.from('category_group_links').upsert([{ group_id: group.id, category_id: cat.id }], { onConflict: 'group_id,category_id' });
    console.log("Linked SOFÁS to SALA DE ESTAR");

    // 4. Find all sofas
    const { data: prods } = await supabase.from('products').select('id, description');

    let count = 0;
    for (let p of prods) {
        // Checking for words like sofa, sofá, estofado, poltrona, etc
        if (/sof[aá]|estof|poltrona|puff|assento/i.test(p.description)) {
            // Update textual category representation
            await supabase.from('products').update({ category: 'SOFÁS' }).eq('id', p.id);

            // Delete previous associations
            await supabase.from('product_categories').delete().eq('product_id', p.id);

            // Re-assign definitively to SOFÁS
            await supabase.from('product_categories').insert([{ product_id: p.id, category_id: cat.id }]);

            count++;
        }
    }

    console.log("Updated " + count + " products to category SOFÁS");
    process.exit(0);
}

run();
