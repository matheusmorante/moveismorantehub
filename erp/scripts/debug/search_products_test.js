import { createClient } from '@supabase/supabase-js';
const url = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(url, key);

async function search() {
    const { data } = await supabase.from('products').select('description').ilike('description', '%GRECIA%');
    console.log('--- PRODUCTS WITH GRECIA ---');
    console.log(JSON.stringify(data, null, 2));

    const { data: data2 } = await supabase.from('products').select('description').ilike('description', '%BALCAO%');
    console.log('\n--- PRODUCTS WITH BALCAO ---');
    console.log(JSON.stringify(data2, null, 2));

    process.exit(0);
}
search();
