import { createClient } from '@supabase/supabase-js';
const url = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase
        .from('products')
        .select('description, images')
        .not('images', 'is', null);
    
    if (error) {
        console.error('API Error:', error);
    } else {
        const withImages = data.filter(p => p.images && p.images.length > 0);
        console.log(`Total products with non-empty images: ${withImages.length}`);
        withImages.slice(0, 5).forEach(p => console.log(`- ${p.description}: ${JSON.stringify(p.images)}`));
    }
    process.exit(0);
}

check();
