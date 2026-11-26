import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const url = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(url, key);
const ROOT_PATH = 'H:\\owner';

async function match() {
    const { data: dbProducts } = await supabase.from('products').select('id, description').eq('deleted', false);
    const folders = fs.readdirSync(ROOT_PATH, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    console.log(`Total DB: ${dbProducts.length}, Total Folders: ${folders.length}`);

    const matches = [];
    for (const folder of folders) {
        const lowFolder = folder.toLowerCase().trim();
        const product = dbProducts.find(p => p.description.toLowerCase().trim() === lowFolder);
        if (product) {
            matches.push({ folder, product: product.description });
        }
    }

    console.log(`Total exact matches: ${matches.length}`);
    matches.slice(0, 20).forEach(m => console.log(`- ${m.folder} -> ${m.product}`));

    process.exit(0);
}
match();
