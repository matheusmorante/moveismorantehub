const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'erp/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('attributes').select('*').in('name', ['Altura', 'Largura', 'Profundidade', 'Peso']);
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

check();
