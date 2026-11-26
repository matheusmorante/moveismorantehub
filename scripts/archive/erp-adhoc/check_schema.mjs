import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

async function main() {
    const { data, error } = await supabase.from('product_variations').select('*').limit(1);
    if (error) console.error(error);
    else console.log(Object.keys(data[0]));
}

main();
