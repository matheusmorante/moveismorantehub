import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ROOT_PATH = 'H:\\owner';
const OUTPUT_FILE = 'apps/erp/public/gallery_inventory.json';

async function run() {
    console.log('--- GENERATING GALLERY INVENTORY ---');

    if (!fs.existsSync(ROOT_PATH)) {
        console.error('Gallery path not found:', ROOT_PATH);
        process.exit(1);
    }

    // 1. Fetch DB Products
    const { data: dbProducts } = await supabase
        .from('products')
        .select('id, description, images')
        .eq('deleted', false);

    // 2. Scan H:\owner
    const folders = fs.readdirSync(ROOT_PATH, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
            const folderPath = path.join(ROOT_PATH, dirent.name);
            const files = fs.readdirSync(folderPath)
                .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
            return {
                name: dirent.name,
                fileCount: files.length,
                files: files
            };
        });

    // 3. Match
    const inventory = {
        generatedAt: new Date().toISOString(),
        folders: folders.map(f => {
            const lowFolder = f.name.toLowerCase().trim();
            const products = dbProducts.filter(p => {
                const lowDesc = p.description.toLowerCase().trim();
                return lowDesc === lowFolder || lowDesc.includes(lowFolder) || lowFolder.includes(lowDesc);
            });

            return {
                ...f,
                matches: products.map(p => ({ id: p.id, description: p.description, hasImages: p.images && p.images.length > 0 }))
            };
        }),
        unmatchedProducts: dbProducts
            .filter(p => !folders.some(f => p.description.toLowerCase().includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(p.description.toLowerCase())))
            .map(p => ({ id: p.id, description: p.description }))
    };

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(inventory, null, 2));

    console.log(`--- FINISHED: Inventory saved to ${OUTPUT_FILE} ---`);
    process.exit(0);
}

run();
