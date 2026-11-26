
const fs = require('fs');

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

async function getProducts() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=name&deleted=eq.false`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const products = await response.json();
        
        const dbNames = products.map(p => p.name.toLowerCase());
        const folders = fs.readdirSync('H:\\owner', { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const summary = {
            total_db: dbNames.length,
            total_folders: folders.length,
            matches: [],
            no_matches: []
        };

        for (const folder of folders) {
            const lowFolder = folder.toLowerCase().trim();
            const match = products.find(p => p.name.toLowerCase().trim() === lowFolder || 
                                           p.name.toLowerCase().includes(lowFolder) || 
                                           lowFolder.includes(p.name.toLowerCase().trim()));
            if (match) {
                summary.matches.push({ folder, product: match.name });
            } else {
                summary.no_matches.push(folder);
            }
        }

        console.log(JSON.stringify(summary, null, 2));
    } catch (e) {
        console.error("ERRO:", e.message);
    }
}

getProducts();
