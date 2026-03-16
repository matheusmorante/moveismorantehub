const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- Listando Produtos para Consolidação ---');
    const { data, error } = await supabase
        .from('products')
        .select('id, description, code, condition, variations')
        .or('description.ilike.G Roupa%,description.ilike.COR:%,description.ilike.Guarda Roupa%,description.ilike.Cozinha Compacta Julie%')
        .eq('deleted', false);

    if (error) {
        console.error('Error:', error);
        return;
    }

    data.forEach(p => {
        console.log(`ID: ${p.id} | Desc: ${p.description} | Code: ${p.code} | Cond: ${p.condition} | Vars: ${p.variations ? p.variations.length : 0}`);
    });
}

check();
