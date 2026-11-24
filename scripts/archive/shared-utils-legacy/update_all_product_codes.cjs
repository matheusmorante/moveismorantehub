const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to run this archived script.');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const stopWords = ["de", "da", "do", "das", "dos", "com", "em", "para", "a", "o", "as", "os"];

function generateBase(description) {
    if (!description) return "PRD";
    const words = description.split(" ").filter(w => w.length > 1 && !stopWords.includes(w.toLowerCase()));
    let base = words.map(w => w.charAt(0).toUpperCase()).join("");
    if (base.length < 2) base = (description.replace(/\s/g, '').substring(0, 3)).toUpperCase();
    return base;
}

async function updateAllCodes() {
    console.log("Fetching products...");
    const { data: products, error } = await supabase
        .from('products')
        .select('id, description, code')
        .eq('deleted', false);
    
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Processing ${products.length} products...`);
    const codesMap = new Map(); // base -> lastIndex

    for (const p of products) {
        const base = generateBase(p.description);
        let currentIndex = (codesMap.get(base) || 0) + 1;
        let newCode = `${base}-${String(currentIndex).padStart(3, '0')}`;
        
        while (Array.from(codesMap.values()).some(v => v === newCode)) {
            currentIndex++;
            newCode = `${base}-${String(currentIndex).padStart(3, '0')}`;
        }

        codesMap.set(base, currentIndex);
        
        console.log(`Updating ${p.id}: ${p.description} -> ${newCode}`);
        const { error: upError } = await supabase
            .from('products')
            .update({ code: newCode })
            .eq('id', p.id);
        
        if (upError) console.error(`Error updating ${p.id}:`, upError);
    }

    console.log("Finished updating all product codes!");
}

updateAllCodes();
