const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function registerAttributes() {
    console.log('--- Iniciando extração de atributos ---');
    
    // 1. Buscar todos os produtos
    const { data: products, error } = await supabase.from('products').select('id, variations');
    
    if (error) {
        console.error('Erro ao buscar produtos:', error);
        return;
    }

    console.log(`Processando ${products.length} produtos...`);

    // 2. Extrair pares Nome:Valor únicos
    const attributeMap = new Map(); // name -> Set of values

    products.forEach(p => {
        if (p.variations && Array.isArray(p.variations)) {
            p.variations.forEach(v => {
                if (v.attributes && Array.isArray(v.attributes)) {
                    v.attributes.forEach(attr => {
                        const name = attr.name?.trim();
                        const value = attr.value?.trim();
                        if (name && value) {
                            if (!attributeMap.has(name)) {
                                attributeMap.set(name, new Set());
                            }
                            attributeMap.get(name).add(value);
                        }
                    });
                }
            });
        }
    });

    console.log(`Encontrados ${attributeMap.size} atributos únicos.`);

    // 3. Buscar atributos já cadastrados
    const { data: existingVariations, error: vError } = await supabase.from('variations').select('*');
    if (vError) {
        console.error('Erro ao buscar variações existentes:', vError);
        return;
    }

    // 4. Sincronizar
    for (const [attrName, attrValues] of attributeMap.entries()) {
        const existing = existingVariations.find(v => v.variation_data.name.toLowerCase() === attrName.toLowerCase());
        
        let targetVariationData;
        let id = null;

        if (existing) {
            console.log(`Atualizando atributo existente: ${attrName}`);
            id = existing.id;
            targetVariationData = { ...existing.variation_data };
            
            // Adicionar novos valores sem duplicar
            attrValues.forEach(val => {
                const alreadyExists = targetVariationData.options.some(opt => opt.value.toLowerCase() === val.toLowerCase());
                if (!alreadyExists) {
                    targetVariationData.options.push({
                        id: Math.random().toString(36).substr(2, 9),
                        value: val
                    });
                    console.log(`  + Adicionando valor: ${val}`);
                }
            });
        } else {
            console.log(`Criando novo atributo: ${attrName}`);
            targetVariationData = {
                name: attrName,
                active: true,
                options: Array.from(attrValues).map(val => ({
                    id: Math.random().toString(36).substr(2, 9),
                    value: val
                }))
            };
        }

        // Upsert
        if (id) {
            const { error: uError } = await supabase
                .from('variations')
                .update({ variation_data: targetVariationData, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (uError) console.error(`Erro ao atualizar ${attrName}:`, uError);
        } else {
            const { error: iError } = await supabase
                .from('variations')
                .insert([{ variation_data: targetVariationData, updated_at: new Date().toISOString() }]);
            if (iError) console.error(`Erro ao inserir ${attrName}:`, iError);
        }
    }

    console.log('--- Processamento concluído ---');
}

registerAttributes();
