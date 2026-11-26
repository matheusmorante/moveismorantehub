import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const generateId = () => Math.random().toString(36).substr(2, 9);

async function ensureProduct(description, data) {
    const { data: existing } = await supabase
        .from('products')
        .select('*')
        .ilike('description', description)
        .eq('deleted', false)
        .limit(1);

    if (existing && existing.length > 0) {
        console.log(`Product matches: "${description}"`);
        const { error } = await supabase
            .from('products')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', existing[0].id);
        return existing[0].id;
    } else {
        console.log(`Creating product: "${description}"`);
        const { data: created, error } = await supabase
            .from('products')
            .insert([{ ...data, description, updated_at: new Date().toISOString() }])
            .select();
        if (error) console.error(`Error creating "${description}":`, error);
        return created ? created[0].id : null;
    }
}

async function run() {
    console.log('--- SETTING UP PRODUCTS AND VARIATIONS ---');

    // 1. Balcão para Pia Grécia
    await ensureProduct('Balcão para Pia Grécia', {
        brand: 'Grécia',
        active: true,
        item_type: 'product',
        condition: 'novo'
    });

    // 2. Balcão para Pia de Cozinha 1.60m J.K. c/ Tampo
    await ensureProduct('Balcão para Pia de Cozinha 1.60m J.K. c/ Tampo', {
        brand: 'J.K.',
        active: true,
        item_type: 'product',
        condition: 'novo'
    });

    // 3. Aéreo 80cm Florença (Móveis Sul)
    const varFlorenca = [
        { id: generateId(), name: 'Canari/Off White', sku: 'FLOR-80-CAN-OFF', stock: 0, unitPrice: 0, costPrice: 0 },
        { id: generateId(), name: 'Angelim/Cinza', sku: 'FLOR-80-ANG-CIN', stock: 0, unitPrice: 0, costPrice: 0 }
    ];
    await ensureProduct('Aéreo 80cm Florença', {
        brand: 'Móveis Sul',
        active: true,
        item_type: 'product',
        condition: 'novo',
        has_variations: true,
        variations: varFlorenca
    });

    // 4. Cômoda França
    await ensureProduct('Cômoda França', {
        active: true,
        item_type: 'product',
        condition: 'novo'
    });

    // 5. Guarda-Roupa Sidney (Doripel)
    const varSidney = [
        { id: generateId(), name: 'Branco', sku: 'SID-BR', stock: 0, unitPrice: 0, costPrice: 0 },
        { id: generateId(), name: 'Preto', sku: 'SID-PR', stock: 0, unitPrice: 0, costPrice: 0 },
        { id: generateId(), name: 'Freijó/Off-White', sku: 'SID-FR-OFF', stock: 0, unitPrice: 0, costPrice: 0 }
    ];
    await ensureProduct('Guarda-Roupa Sidney', {
        brand: 'Doripel',
        active: true,
        item_type: 'product',
        condition: 'novo',
        has_variations: true,
        variations: varSidney
    });

    // 6. Sapateira Ravenna
    const varRavenna = [
        { id: generateId(), name: 'Branco', sku: 'RAV-BR', stock: 0, unitPrice: 0, costPrice: 0 },
        { id: generateId(), name: 'Tauari', sku: 'RAV-TAU', stock: 0, unitPrice: 0, costPrice: 0 }
    ];
    await ensureProduct('Sapateira Ravenna', {
        active: true,
        item_type: 'product',
        condition: 'novo',
        has_variations: true,
        variations: varRavenna
    });

    // 7. Guarda-Roupa Panama (Moval)
    await ensureProduct('Guarda-Roupa Panama', {
        brand: 'Moval',
        active: true,
        item_type: 'product',
        condition: 'novo'
    });

    // 8. Guarda-Roupa Bergamo 4 Portas Solteiro
    const varBergamo = [
        { id: generateId(), name: 'Branco', sku: 'BER-SOL-BR', stock: 0, unitPrice: 0, costPrice: 0 },
        { id: generateId(), name: 'Preto', sku: 'BER-SOL-PR', stock: 0, unitPrice: 0, costPrice: 0 }
    ];
    await ensureProduct('Guarda-Roupa Bergamo 4 Portas Solteiro', {
        active: true,
        item_type: 'product',
        condition: 'novo',
        has_variations: true,
        variations: varBergamo
    });

    console.log('--- FINISHED ---');
    process.exit(0);
}

run();
