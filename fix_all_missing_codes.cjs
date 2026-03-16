
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'erp/.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
const fs = require('fs');
const LOG_FILE = path.join(__dirname, 'fix_progress.txt');
fs.writeFileSync(LOG_FILE, 'Starting fix...\n');

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + '\n');
};

const slugify = (text) => {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};

async function fixMissingCodes() {
    log('Buscando produtos sem código...');
    const { data: products, error } = await supabase
        .from('products')
        .select('id, description, code, variations, has_variations');

    if (error) {
        log('Erro ao buscar produtos: ' + JSON.stringify(error));
        return;
    }

    log(`Verificando ${products.length} produtos...`);
    let updatedCount = 0;

    for (const p of products) {
        let changed = false;
        let pCode = p.code;

        // Fix parent code
        if (!pCode || pCode.trim() === '') {
            pCode = `PROD-${slugify(p.description).substring(0, 15).toUpperCase()}-${p.id.substring(0, 4)}`;
            log(`Fixing parent code: [${p.description}] -> ${pCode}`);
            changed = true;
        }

        // Fix variations codes
        let variations = p.variations || [];
        if (p.has_variations && variations.length > 0) {
            variations = variations.map((v, idx) => {
                if (!v.sku || v.sku.trim() === '' || v.sku === pCode) {
                    const suffix = v.name ? slugify(v.name).toUpperCase() : `VAR-${idx+1}`;
                    v.sku = `${pCode}-${suffix}`;
                    console.log(`  Fixing variation [${v.name}] code -> ${v.sku}`);
                    changed = true;
                }
                return v;
            });
        }

        if (changed) {
            const { error: uError } = await supabase
                .from('products')
                .update({ 
                    code: pCode, 
                    variations 
                })
                .eq('id', p.id);
            
            if (uError) {
                log(`Erro ao atualizar produto ${p.id}: ` + JSON.stringify(uError));
            } else {
                updatedCount++;
            }
        }
    }

    log(`Correção concluída! ${updatedCount} produtos atualizados.`);
}

fixMissingCodes();
