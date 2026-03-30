const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: './.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('people').insert([
        { 
            person_type: 'customers', 
            person_type_pf_pj: 'PF', 
            full_name: 'Test Client', 
            social_name: '', 
            cpf_cnpj: '000.000.000-00', 
            email: 'test@test.com', 
            phone: '11999999999', 
            position: null, 
            active: true, 
            is_draft: false, 
            marketing_origin: 'organic', 
            address: {street: 'Rua A'}, 
            updated_at: new Date().toISOString() 
        }
    ]).select();
    
    console.log("Supabase Error Data:", JSON.stringify(error, null, 2));
    
    if (data) {
        // delete it right after test
        await supabase.from('people').delete().eq('id', data[0].id);
    }
}

check();
