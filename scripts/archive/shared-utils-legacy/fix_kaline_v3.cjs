const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to run this archived script.');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixCustomerFinal() {
    const id = 981; // ID found earlier
    console.log(`Fixing customer ${id}...`);

    const updates = {
        is_draft: false,
        person_type: 'PF',
        cpf_cnpj: '000.000.000-00', // Placeholder
        email: 'contato@exemplo.com', // Placeholder
        nickname: 'Kaline',
        rg_ie: '0000', // Placeholder
        active: true,
        address: {
            cep: "83650-000",
            city: "Balsa Nova",
            state: "PR",
            number: "165",
            street: "Rua Ricardo Jacomasso",
            complement: "Casa",
            neighborhood: "Conj. Hab. Moradias Iguaçu"
        }
    };

    const { data, error } = await supabase
        .from('people')
        .update(updates)
        .eq('id', id);

    if (error) console.error("Error updating:", error);
    else console.log("Customer updated successfully!");
}

fixCustomerFinal();
