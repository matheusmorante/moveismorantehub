const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6Mj85MzczNDkzOH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY'; // Corrigida a chave
const oldSupabase = createClient(OLD_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY');

async function test() {
    const { data, error } = await oldSupabase.from('orders').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log("Exemplo de linha do banco antigo:", JSON.stringify(data[0], null, 2));
    }
}

test();
