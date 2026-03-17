
import { createClient } from '@supabase/supabase-client';

const supabaseUrl = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Categories in DB:', data.map(c => ({ id: c.id, name: c.name })));
}

checkCategories();
