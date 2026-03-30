import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    console.log("Testing insert connection to:", SUPABASE_URL);
    
    const { data: cols, error: e1 } = await supabase.from('people').select('*').limit(1);
    console.log("Columns currently present:", cols && cols[0] ? Object.keys(cols[0]) : "No columns or rows");
    console.log("Select Error:", JSON.stringify(e1));
    
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
    
    console.log("Supabase Insert Error:", JSON.stringify(error, null, 2));
    
    if (data) {
        await supabase.from('people').delete().eq('id', data[0].id);
    }
}

check();
