import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

async function main() {
    const targetParentId = '5f44c0e1-1596-4f27-adc8-9f0afce089f7'; // 000314
    const oldParentId = '96a16c93-d899-49e8-9e4e-aa188d6c2744'; // 000281 (Guarda Roupa Casal 2,37m MDP/MDF 8 Portas Paris - Cinamomo)
    const variationId = '8385417c-c5d9-4462-a8a7-5fea12da0da2'; // 000314-03 (Cinamomo/Branco)

    // 1. Obter as imagens do antigo pai (000281)
    const { data: oldImages } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', oldParentId);

    if (!oldImages || oldImages.length === 0) {
        console.log('No old images found.');
        return;
    }
    
    const imageUrls = oldImages.map(img => img.image_url);
    console.log('Real Cinamomo Images to restore:', imageUrls);

    // 2. Atualizar a variação com essas fotos reais
    const { error: varError } = await supabase
        .from('product_variations')
        .update({ image_url: imageUrls.join(',') })
        .eq('id', variationId);
        
    if (varError) console.error('Error updating variation:', varError);

    // 3. Atualizar a tabela product_images do pai atual (000314) com as fotos reais
    const { data: currentImages } = await supabase
        .from('product_images')
        .select('image_url')
        .eq('product_id', targetParentId);
        
    const currentUrls = new Set(currentImages?.map(i => i.image_url) || []);
    const newRecords = imageUrls.filter(url => !currentUrls.has(url)).map(url => ({
        product_id: targetParentId,
        image_url: url,
        is_main: false
    }));

    if (newRecords.length > 0) {
        const { error: insertError } = await supabase
            .from('product_images')
            .insert(newRecords);
        if (insertError) console.error('Error inserting into product_images:', insertError);
    }
    
    // 4. Atualizar a coluna products.images do pai
    const { data: parentRecord } = await supabase
        .from('products')
        .select('images')
        .eq('id', targetParentId)
        .single();
        
    const mergedImages = [...new Set([...(parentRecord?.images || []), ...imageUrls])];
    const { error: updateError } = await supabase
        .from('products')
        .update({ images: mergedImages })
        .eq('id', targetParentId);
        
    if (updateError) console.error('Error updating products.images:', updateError);

    console.log('Cinamomo restoration complete!');
}

main().catch(console.error);
