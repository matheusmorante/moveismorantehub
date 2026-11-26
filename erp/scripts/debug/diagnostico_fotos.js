
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGRmbWlobndjcmdreWFnd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Nzg0NTQsImV4cCI6MjA4ODU1NDQ1NH0.Mb4kqKeDYILblAD83z9PYOywQ_V0MZ31LI0AlA_1GwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ROOT_PATH = 'H:\\owner';

async function diagnose() {
    try {
        console.log("--- PRODUTOS NO BANCO ---");
        const { data: products, error } = await supabase.from('products').select('name').eq('deleted', false);
        if (error) throw error;
        
        const dbNames = products.map(p => p.name.toLowerCase());
        console.log(`Total no banco: ${dbNames.length}`);

        console.log("\n--- PASTAS NO HD ---");
        const folders = fs.readdirSync(ROOT_PATH, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        console.log(`Total de pastas: ${folders.length}`);

        const exactMatches = [];
        const partialMatches = [];
        const noMatches = [];

        for (const folder of folders) {
            const lowFolder = folder.toLowerCase();
            if (dbNames.includes(lowFolder)) {
                exactMatches.push(folder);
            } else {
                const partial = products.find(p => p.name.toLowerCase().includes(lowFolder) || lowFolder.includes(p.name.toLowerCase()));
                if (partial) {
                    partialMatches.push(`${folder} -> ${partial.name}`);
                } else {
                    noMatches.push(folder);
                }
            }
        }

        console.log(`\n✅ Matches Exatos: ${exactMatches.length}`);
        console.log(`\n🤔 Matches Parciais: ${partialMatches.length}`);
        partialMatches.slice(0, 10).forEach(m => console.log(`   ${m}`));
        
        console.log(`\n❌ Sem Match: ${noMatches.length}`);
        noMatches.slice(0, 10).forEach(m => console.log(`   ${m}`));

        if (noMatches.length > 0) {
            fs.writeFileSync('sem_match.json', JSON.stringify(noMatches, null, 2));
            console.log("\n📄 Lista completa de 'Sem Match' salva em sem_match.json");
        }

    } catch (e) {
        console.error("ERRO:", e.message);
    }
}

diagnose();
