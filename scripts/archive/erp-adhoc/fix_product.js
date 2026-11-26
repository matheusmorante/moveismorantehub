import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Set the parent product to active = true
    const { data: updateData, error: updateError } = await supabase
        .from('products')
        .update({ active: true })
        .eq('id', '78443664-c211-45d1-bc97-fd556a8d764f')
        .select();
        
    if (updateError) {
        console.error('Error updating product:', updateError);
        return;
    }
    console.log('Updated product successfully:', updateData);
}

run();
