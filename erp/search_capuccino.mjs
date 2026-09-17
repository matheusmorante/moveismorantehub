import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

async function main() {
    const parentId = '5f44c0e1-1596-4f27-adc8-9f0afce089f7'; // 000314
    const oldParentId = '204bb4ab-9e0f-4c05-af1a-7ed23162a368'; // 000265 (Guarda Roupa Casal 2,37 8 Portas Paris - Capuccino/Terracota)
    const variationId = 'd0388a28-79f9-4d68-9be5-fe2bda5641ef'; // Capuccino/Terracota

    // 1. Obter as imagens do VERDADEIRO pai antigo (000265)
    const { data: oldImages } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', oldParentId);

    if (!oldImages || oldImages.length === 0) {
        console.log('No old images found.');
        return;
    }
    
    const imageUrls = oldImages.map(img => img.image_url);
    console.log('Real Capuccino Images to restore:', imageUrls);

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
        .eq('product_id', parentId);
        
    const currentUrls = new Set(currentImages?.map(i => i.image_url) || []);
    const newRecords = imageUrls.filter(url => !currentUrls.has(url)).map(url => ({
        product_id: parentId,
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
        .eq('id', parentId)
        .single();
        
    const mergedImages = [...new Set([...(parentRecord?.images || []), ...imageUrls])];
    const { error: updateError } = await supabase
        .from('products')
        .update({ images: mergedImages })
        .eq('id', parentId);
        
    if (updateError) console.error('Error updating products.images:', updateError);

    console.log('Real restoration complete!');
}

main().catch(console.error);
