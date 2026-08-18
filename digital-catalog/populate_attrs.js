require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const ecomUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ecomKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL:", ecomUrl);
console.log("Key length:", ecomKey ? ecomKey.length : 0);

const supabase = createClient(ecomUrl, ecomKey);

const capitalize = (str) => {
    if (!str) return "";
    const trimmed = str.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

async function sync() {
    console.log("1. Buscando variações do E-commerce...");
    const { data: variations, error: varErr } = await supabase.from('product_variations').select('attributes');
    if (varErr) {
        console.error("Erro ao buscar variações:", varErr);
        return;
    }
    console.log(`Encontradas ${variations.length} variações.`);

    const attrMap = new Map();

    for (const v of variations) {
        if (!v.attributes) continue;
        let attrs = v.attributes;
        if (typeof attrs === 'string') {
            try { attrs = JSON.parse(attrs); } catch (e) {}
        }
        if (typeof attrs === 'object' && attrs !== null) {
            for (const [key, val] of Object.entries(attrs)) {
                if (!key || !val) continue;
                const attrName = capitalize(key);
                const attrVal = capitalize(String(val));

                if (!attrMap.has(attrName)) {
                    attrMap.set(attrName, new Set());
                }
                attrMap.get(attrName).add(attrVal);
            }
        }
    }

    console.log("\nAtributos e valores extraídos:");
    for (const [name, vals] of attrMap.entries()) {
        console.log(`- ${name}:`, Array.from(vals));
    }

    for (const [name, valsSet] of attrMap.entries()) {
        let { data: existing } = await supabase.from('attributes').select('id').eq('name', name);
        let attrId;

        if (existing && existing.length > 0) {
            attrId = existing[0].id;
            console.log(`\nAtributo '${name}' já existe (ID: ${attrId}).`);
        } else {
            let { data: inserted, error: insErr } = await supabase.from('attributes').insert([{ name, active: true }]).select();
            if (insErr) {
                const { data: inserted2, error: insErr2 } = await supabase.from('attributes').insert([{ name }]).select();
                inserted = inserted2;
                insErr = insErr2;
            }
            if (insErr) {
                console.error(`Erro ao inserir atributo '${name}':`, insErr);
                continue;
            }
            attrId = inserted[0].id;
            console.log(`\nAtributo '${name}' inserido (ID: ${attrId}).`);
        }

        for (const val of valsSet) {
            const { data: valExist } = await supabase.from('attribute_values').select('id').eq('attribute_id', attrId).eq('value', val);
            if (!valExist || valExist.length === 0) {
                const { error: valInsErr } = await supabase.from('attribute_values').insert([{ attribute_id: attrId, value: val }]);
                if (valInsErr) {
                    console.error(`  - Erro ao inserir valor '${val}':`, valInsErr);
                } else {
                    console.log(`  + Valor '${val}' inserido.`);
                }
            } else {
                console.log(`  = Valor '${val}' já existe.`);
            }
        }
    }

    console.log("\n✅ Sincronização concluída com sucesso!");
}

sync();
