import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('products').select('id, name, code, description, category_id').ilike('name', '%Florença%');
    console.log("By Name:", JSON.stringify({data, error}, null, 2));

    const { data: d2, error: e2 } = await supabase.from('products').select('id, name, code, description, category_id').ilike('code', '%253%');
    console.log("By Code:", JSON.stringify({data: d2, error: e2}, null, 2));
}

run();
