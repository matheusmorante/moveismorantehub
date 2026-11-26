const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wzpdfmihnwcrgkyagwkd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

async function run() {
    let { data: groups } = await supabase.from('category_groups').select('*');
    const { data: cats } = await supabase.from('categories').select('*');
    const { data: prods } = await supabase.from('products').select('id, description, category');

    let salvadosGroup = groups.find(g => g.name.toUpperCase() === 'SALVADOS');

    const mapping = [
        { regex: /g\s?roupa|roupeiro|guarda\s?roupa|cabeceira|cama|beliche|treliche|criado\s?mudo|comoda|c[ôo]mada|sapateira|colch[aã]o|base\s?box/i, cat: 'GUARDA ROUPAS', group: 'QUARTO' },
        { regex: /sal\s?jantar|sl\s?jantar|mesa.+cad|conjunto sala/i, cat: 'MESA DE JANTAR', group: 'SALA DE JANTAR' },
        { regex: /colch[aã]o/i, cat: 'COLCHÕES', group: 'QUARTO' },
        { regex: /base\s?box/i, cat: 'BOX CONJUGADO', group: 'QUARTO' },
        { regex: /comoda|c[ôo]mada/i, cat: 'CÔMODAS', group: 'QUARTO' },
        { regex: /escrivaninha|gaveteiro\s?office/i, cat: 'MESA PARA ESCRITÓRIO', group: 'ESCRITÓRIO' },
        { regex: /sapateira/i, cat: 'MULTIUSO / SAPATEIRA', group: 'QUARTO' },
        { regex: /multiuso\s?dueto|balc[aã]o|cozinha\s?(4|compacta)|pia\s|torre\s?2\s?fornos|recorte\s?para\s?cooktop|aereo|armario\s?multiuso\s?jade|kit\s*1\s*forno/i, cat: 'BALCÃO COM TAMPO', group: 'COZINHA' },
        { regex: /estof|sof[aá]|poltrona|puff/i, cat: 'SOFÁS E ESTOFADOS', group: 'SALA' },
        { regex: /cabeceira/i, cat: 'CABECEIRA', group: 'QUARTO' },
        { regex: /painel|bancada|home|rack|cristaleira|mesa\s?de\s?centro/i, cat: 'PAINEL', group: 'SALA' },
        { regex: /banheiro|armario\s?banheiro/i, cat: 'CONJUNTO BANHEIRO', group: 'BANHEIRO' },
        { regex: /lavanderia|tanque/i, cat: 'BALCÃO MULTIUSO 2PT', group: 'LAVANDERIA' } // re-using balcão multiuso para lavanderia
    ];

    // Refining categories specifically as requested
    const refinedMapping = [
        { regex: /g\s?roupa|roupeiro|guarda\s?roupa/i, cat: 'GUARDA ROUPAS', group: 'QUARTO' },
        { regex: /cabeceira/i, cat: 'CABECEIRA', group: 'QUARTO' },
        { regex: /cama|beliche|treliche/i, cat: 'CAMA', group: 'QUARTO' },
        { regex: /criado\s?mudo/i, cat: 'MESA DE CABECEIRA', group: 'QUARTO' },
        { regex: /comoda|c[ôo]mada/i, cat: 'CÔMODAS', group: 'QUARTO' },
        { regex: /sapateira/i, cat: 'MULTIUSO / SAPATEIRA', group: 'QUARTO' },
        { regex: /colch[aã]o/i, cat: 'COLCHÕES', group: 'QUARTO' },
        { regex: /base\s?box/i, cat: 'BOX CONJUGADO', group: 'QUARTO' },

        { regex: /sal\s?jantar|sl\s?jantar|mesa.+cad|conjunto sala/i, cat: 'MESA DE JANTAR', group: 'SALA DE JANTAR' },

        { regex: /escrivaninha|gaveteiro\s?office/i, cat: 'MESA PARA ESCRITÓRIO', group: 'ESCRITÓRIO' },

        { regex: /multiuso\s?dueto|balc[aã]o|cozinha\s?(4|compacta)|pia[\s\b]|torre\s?2\s?fornos|aereo|armario\s?multiuso\s?jade|kit\s*1\s*forno|armario\s*multiuso/i, cat: 'BALCÃO COM TAMPO', group: 'COZINHA' },
        { regex: /recorte\s?para\s?cooktop/i, cat: 'BALCÃO COM TAMPO', group: 'COZINHA' },

        { regex: /estof|sof[aá]|poltrona|puff|assento/i, cat: 'SOFÁS E ESTOFADOS', group: 'SALA' },
        { regex: /painel|bancada|home|rack|cristaleira|mesa\s?de\s?centro/i, cat: 'PAINEL', group: 'SALA' },

        { regex: /banheiro/i, cat: 'CONJUNTO BANHEIRO', group: 'BANHEIRO' },
        { regex: /lavanderia|tanque|t[aá]bua\s?de\s?passar/i, cat: 'MULTIUSO / SAPATEIRA', group: 'LAVANDERIA' }
    ];

    const fallbackCatName = 'DIVERSOS';
    let fallbackCat = cats.find(c => c.name === fallbackCatName);
    if (!fallbackCat) {
        let res = await supabase.from('categories').insert([{ name: fallbackCatName, active: true }]).select();
        fallbackCat = res.data[0];
        cats.push(fallbackCat);
    }

    // Process matching
    let count = 0;
    for (let p of prods) {
        // Only classify if string category is empty OR it has salvados in name
        let isSalvados = /salvados/i.test(p.description);
        let needsCategorization = !p.category || isSalvados;

        if (!needsCategorization) continue;

        let matchedCatName = fallbackCatName;
        let matchedGroupName = '';

        for (let rule of refinedMapping) {
            if (rule.regex.test(p.description)) {
                matchedCatName = rule.cat;
                matchedGroupName = rule.group;
                break;
            }
        }

        let cat = cats.find(c => c.name.toUpperCase() === matchedCatName.toUpperCase());
        if (!cat) {
            const { data: newC } = await supabase.from('categories').insert([{ name: matchedCatName, active: true }]).select();
            cat = newC[0];
            cats.push(cat);
        }

        let groupToLinkTo = null;
        if (isSalvados) {
            groupToLinkTo = salvadosGroup;
        } else if (matchedGroupName) {
            groupToLinkTo = groups.find(g => g.name.toUpperCase() === matchedGroupName.toUpperCase());
        }

        if (groupToLinkTo) {
            await supabase.from('category_group_links').upsert([{ group_id: groupToLinkTo.id, category_id: cat.id }], { onConflict: 'group_id,category_id' });
        }

        let categoryString = isSalvados ? `SALVADOS >> ${matchedGroupName ? matchedGroupName + ' >> ' : ''}${matchedCatName}` : matchedCatName;

        await supabase.from('products').update({ category: categoryString }).eq('id', p.id);

        // delete previous classifications for this product to prevent duplicates
        await supabase.from('product_categories').delete().eq('product_id', p.id);

        // assign the single true category ID 
        await supabase.from('product_categories').upsert([{ product_id: p.id, category_id: cat.id }], { onConflict: 'product_id,category_id' });

        count++;
    }

    console.log("Categorization complete! Checked and categorized " + count + " items.");
    process.exit(0);
}

run();
