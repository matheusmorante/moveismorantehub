import { createClient } from '@supabase/supabase-js';

const erpUrl = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const erpKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const erpSupabase = createClient(erpUrl, erpKey);

const ecomUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const ecomKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const ecomSupabase = createClient(ecomUrl, ecomKey);

async function runCopy() {
    console.log("1. Lendo atributos do banco do ERP...");
    const { data: erpAttrs, error: erpAttrsErr } = await erpSupabase.from('attributes').select('*');
    if (erpAttrsErr) console.error("Erro ao buscar atributos do ERP:", erpAttrsErr);
    console.log(`Encontrados ${erpAttrs ? erpAttrs.length : 0} atributos no ERP.`);

    console.log("2. Lendo valores de atributos do banco do ERP...");
    const { data: erpVals, error: erpValsErr } = await erpSupabase.from('attribute_values').select('*');
    if (erpValsErr) console.error("Erro ao buscar valores de atributos do ERP:", erpValsErr);
    console.log(`Encontrados ${erpVals ? erpVals.length : 0} valores no ERP.`);

    if (!erpAttrs || erpAttrs.length === 0) {
        console.log("Nenhum atributo encontrado na base antiga do ERP.");
        return;
    }

    console.log("\n3. Copiando atributos e valores para o banco do E-Commerce...");

    for (const attr of erpAttrs) {
        const { data: existing } = await ecomSupabase.from('attributes').select('id').eq('name', attr.name);
        let targetAttrId;

        if (existing && existing.length > 0) {
            targetAttrId = existing[0].id;
            console.log(`\nAtributo '${attr.name}' já existe no E-Commerce (ID: ${targetAttrId}).`);
        } else {
            let { data: inserted, error: insErr } = await ecomSupabase.from('attributes').insert([{ name: attr.name, active: true }]).select();
            if (insErr) {
                const { data: inserted2, error: insErr2 } = await ecomSupabase.from('attributes').insert([{ name: attr.name }]).select();
                inserted = inserted2;
                insErr = insErr2;
            }

            if (insErr) {
                console.error(`Erro ao copiar atributo '${attr.name}' para o E-commerce:`, insErr);
                continue;
            }

            targetAttrId = inserted[0].id;
            console.log(`\nAtributo '${attr.name}' copiado para o E-Commerce com sucesso (ID: ${targetAttrId}).`);
        }

        const valuesForAttr = (erpVals || []).filter(v => v.attribute_id === attr.id);
        console.log(`Copiando ${valuesForAttr.length} valores para '${attr.name}'...`);

        for (const val of valuesForAttr) {
            const { data: existVal } = await ecomSupabase.from('attribute_values').select('id').eq('attribute_id', targetAttrId).eq('value', val.value);
            if (!existVal || existVal.length === 0) {
                const { error: valInsErr } = await ecomSupabase.from('attribute_values').insert([{ attribute_id: targetAttrId, value: val.value }]);
                if (valInsErr) {
                    console.error(`  - Erro ao copiar valor '${val.value}':`, valInsErr);
                } else {
                    console.log(`  + Valor '${val.value}' copiado.`);
                }
            } else {
                console.log(`  = Valor '${val.value}' já existente no E-Commerce.`);
            }
        }
    }

    console.log("\n✅ Cópia concluída com sucesso!");
}

runCopy();
