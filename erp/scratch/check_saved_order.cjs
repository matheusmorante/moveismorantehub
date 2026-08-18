const { createClient } = require('@supabase/supabase-js');

const NEW_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const newSupabase = createClient(NEW_URL, NEW_KEY);

async function check() {
    // Buscar o ultimo pedido editado/atualizado
    const { data, error } = await newSupabase
        .from('orders')
        .select('id, order_data, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error(error);
    } else {
        console.log("Ultimo pedido modificado no banco novo:");
        console.log("ID:", data[0].id);
        console.log("Updated At:", data[0].updated_at);
        console.log("CustomerData no JSON:", JSON.stringify(data[0].order_data?.customerData, null, 2));
    }
}

check();
