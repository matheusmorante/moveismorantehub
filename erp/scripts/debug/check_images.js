import { createClient } from '@supabase/supabase-js';
const url = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase
        .from('products')
        .select('name, main_image_url')
        .not('main_image_url', 'is', null)
        .limit(10);
    
    if (error) {
        console.error('API Error:', error);
    } else {
        console.log(`Found ${data.length} products with images.`);
        data.forEach(p => console.log(`- ${p.name}: ${p.main_image_url}`));
    }
    process.exit(0);
}

check();
