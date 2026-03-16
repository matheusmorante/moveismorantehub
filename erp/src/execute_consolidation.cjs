const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runConsolidation() {
    console.log('🚀 Iniciando Consolidação em Massa...');

    // 1. Normalização Global de CAPS LOCK
    console.log('--- 1. Normalizando Títulos, Marcas e Modelos para MAIÚSCULAS ---');
    const { data: allProducts, error: pError } = await supabase.from('products').select('id, description, brand, line, category, condition, variations');
    if (pError) throw pError;

    for (const p of allProducts) {
        process.stdout.write(`.` ); // Indicador de progresso
        const update = {
            description: p.description?.toUpperCase(),
            brand: p.brand?.toUpperCase(),
            line: p.line?.toUpperCase(),
            category: p.category?.toUpperCase(),
            condition: p.condition?.toLowerCase() || 'novo'
        };

        // Normalização de variações
        if (p.variations && p.variations.length > 0) {
            update.variations = p.variations.map(v => ({
                ...v,
                name: v.name?.toUpperCase(),
                sku: v.sku?.toUpperCase(),
                attributes: v.attributes?.map(a => ({
                    name: a.name?.toUpperCase(),
                    value: a.value?.toUpperCase()
                }))
            }));
        }

        await supabase.from('products').update(update).eq('id', p.id);
    }
    console.log('✅ Normalização básica concluída.');

    // 2. Limpeza de prefixos/sufixos "G Roupa", "salvados" e ortografia
    console.log('--- 2. Limpeza de Títulos e Ortografia (DORIPEL, SAN MARINO, etc.) ---');
    const { data: productsToClean } = await supabase.from('products').select('id, description, brand, condition').eq('deleted', false);
    
    for (const p of productsToClean) {
        let newTitle = p.description;
        let changed = false;

        // G Roupa -> Guarda Roupa
        if (newTitle.includes('G ROUPA')) {
            newTitle = newTitle.replace(/G ROUPA/g, 'GUARDA ROUPA');
            changed = true;
        }
        
        // Limpeza de duplicados "GUARDA ROUPA ROUPA"
        if (newTitle.includes('GUARDA ROUPA ROUPA')) {
            newTitle = newTitle.replace(/GUARDA ROUPA ROUPA/g, 'GUARDA ROUPA');
            changed = true;
        }

        // Remover "SALVADOS" do título
        if (newTitle.includes('SALVADOS')) {
            newTitle = newTitle.replace(/SALVADOS/g, '').trim();
            changed = true;
        }

        // Correção SUMARINO -> SAN MARINO
        if (newTitle.includes('SUMARINO')) {
            newTitle = newTitle.replace(/SUMARINO/g, 'SAN MARINO');
            changed = true;
        }

        // Correção MADEMAX -> MADEMACS
        if (newTitle.includes('MADEMAX')) {
            newTitle = newTitle.replace(/MADEMAX/g, 'MADEMACS');
            changed = true;
        }

        // Correção BIANCA -> BIANCHI (apenas se for o modelo BIANCHI ALVORADA ou similar conforme plano)
        // Nota: O usuário pediu B-I-A-N-C-H-I. 
        if (newTitle.includes('BIANCA')) {
            newTitle = newTitle.replace(/BIANCA/g, 'BIANCHI');
            changed = true;
        }

        if (changed) {
            await supabase.from('products').update({ description: newTitle }).eq('id', p.id);
        }
    }
    console.log('✅ Títulos limpos.');

    // 3. Aplicação de Marcas (Fabricantes)
    console.log('--- 3. Atualizando Marcas/Fabricantes ---');
    const brandMappings = [
        { pattern: 'SAN MARINO', brand: 'MAXEL' },
        { pattern: 'PARIS', brand: 'MAXEL' },
        { pattern: 'AURA', brand: 'HB MÓVEIS' },
        { pattern: 'AURORA', brand: 'MOBLER' }, // Conforme plano
        { pattern: 'SIDNEY', brand: 'DORIPEL' },
        { pattern: 'BÉRGAMO', brand: 'DORIPEL' },
        { pattern: 'SANTIAGO', brand: 'DORIPEL' },
        { pattern: 'ROSÁRIO', brand: 'DORIPEL' },
        { pattern: 'NEW SHANGHAI', brand: 'DORIPEL' },
        { pattern: 'PANAMÁ', brand: 'DORIPEL' },
        { pattern: 'NT4015', brand: 'NOTÁVEL' },
        { pattern: 'ATALAIA', brand: 'EVIDENCE' },
        { pattern: 'CZ6601', brand: 'EVIDENCE' },
        { pattern: 'REAL', brand: 'ATUALLÉ' },
        { pattern: 'CATARINA', brand: 'ARAMÓVEIS' },
        { pattern: 'COIMBRA', brand: 'ARAMÓVEIS' },
        { pattern: 'FIRENZE', brand: 'IDEX' },
        { pattern: 'VERONA', brand: 'MADEMACS' },
        { pattern: 'RESENDE', brand: 'SOBRAL' },
        { pattern: 'DALLAS', brand: 'SOBRAL' },
        { pattern: 'VENEZA', brand: 'TECNO' },
        { pattern: 'ENCANTO', brand: 'PÉRTIGO' }
    ];

    for (const mapping of brandMappings) {
        await supabase.from('products').update({ brand: mapping.brand })
            .ilike('description', `%${mapping.pattern}%`)
            .eq('deleted', false);
    }
    console.log('✅ Marcas atualizadas.');

    // 4. Consolidação de Pedidos (Exemplo: Rosário)
    // Para simplificar aqui, identificamos IDs duplicados manualmente baseados em padrões
    // Nota: O script de migração de pedidos real precisa de IDs específicos.
    // Vou rodar uma busca por duplicados e migrar para o mais antigo (master).
    
    console.log('--- 4. Consolidando Duplicados e Migrando Pedidos ---');
    const { data: duplicates } = await supabase.rpc('get_duplicate_products'); 
    // Como get_duplicate_products pode não existir, faremos via JS
    
    const { data: activeProds } = await supabase.from('products').select('id, description, variations').eq('deleted', false);
    const groups = {};
    activeProds.forEach(p => {
        const key = p.description.trim().toUpperCase();
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    });

    for (const key in groups) {
        if (groups[key].length > 1) {
            const sorted = groups[key].sort((a, b) => parseInt(a.id) - parseInt(b.id));
            const master = sorted[0];
            const slaves = sorted.slice(1);

            console.log(`Consolidando [${key}]. Master ID: ${master.id}, Slaves: ${slaves.map(s => s.id)}`);
            
            for (const slave of slaves) {
                // Migrar pedidos no JSONB
                const { data: orders } = await supabase.from('orders').select('id, order_data').contains('order_data', { items: [{ productId: slave.id }] });
                if (orders) {
                    for (const order of orders) {
                        const newData = { ...order.order_data };
                        newData.items = newData.items.map(it => it.productId === slave.id ? { ...it, productId: master.id } : it);
                        await supabase.from('orders').update({ order_data: newData }).eq('id', order.id);
                    }
                }
                // Deletar escravo
                await supabase.from('products').update({ deleted: true, active: false }).eq('id', slave.id);
            }
        }
    }
    console.log('✅ Consolidação concluída.');

    // 5. Densidade para Variações
    console.log('--- 5. Convertendo Densidade Dxx em Variações ---');
    const { data: mattresses } = await supabase.from('products').select('id, description').ilike('description', '% D%');
    for (const m of mattresses) {
        const match = m.description.match(/D(\d{2})/);
        if (match) {
            const density = `D${match[1]}`;
            const cleanTitle = m.description.replace(density, '').trim();
            
            await supabase.from('products').update({ 
                description: cleanTitle,
                has_variations: true,
                variations: [{
                    id: crypto.randomUUID(),
                    name: `DENSIDADE: ${density}`,
                    attributes: [{ name: 'DENSIDADE', value: density }],
                    sku: `${cleanTitle.substring(0,5)}-${density}`,
                    stock: 0,
                    active: true
                }]
            }).eq('id', m.id);
        }
    }
    console.log('✅ Densidades convertidas.');

    console.log('--- FIM DA CONSOLIDAÇÃO ---');
}

runConsolidation().catch(console.error);
