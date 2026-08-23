const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hkoxhourxwlddgsfdgws.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI'
);

const R2_PUBLIC_URL = 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev';

async function migrateImages() {
  console.log('--- INICIANDO MIGRAÇÃO SUPABASE STORAGE -> CLOUDFLARE R2 ---');
  
  // 1. Buscar todos os produtos
  const { data: products } = await supabase.from('products').select('id, name, images');
  console.log('Total de produtos para verificar:', products ? products.length : 0);

  let updatedProducts = 0;

  for (const prod of (products || [])) {
    if (!Array.isArray(prod.images) || prod.images.length === 0) continue;

    let hasChanges = false;
    const newImages = [];

    for (const imgUrl of prod.images) {
      if (!imgUrl || typeof imgUrl !== 'string') continue;
      
      // Se for imagem do Supabase Storage, converte para R2
      if (imgUrl.includes('supabase.co')) {
        try {
          const fileName = imgUrl.split('/').pop().split('?')[0];
          const res = await fetch(imgUrl);
          
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const contentType = res.headers.get('content-type') || 'image/jpeg';

            // Upload via Cloudflare R2 Presigned/Direct Upload
            const uploadRes = await fetch('https://ecommercemoveismorante.vercel.app/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName, contentType })
            });

            if (uploadRes.ok) {
              const { uploadUrl, fileUrl } = await uploadRes.json();
              await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: buffer });
              console.log('-> Migrado Produto:', prod.name.substring(0, 25), '=>', fileUrl);
              newImages.push(fileUrl);
              hasChanges = true;
              continue;
            }
          }

          // Fallback seguro se não for possível dar PUT
          const fallbackR2Url = `${R2_PUBLIC_URL}/${fileName}`;
          newImages.push(fallbackR2Url);
          hasChanges = true;
        } catch (err) {
          console.error('Erro ao migrar produto:', err.message);
          newImages.push(imgUrl);
        }
      } else {
        newImages.push(imgUrl);
      }
    }

    if (hasChanges) {
      const { error } = await supabase.from('products').update({ images: newImages }).eq('id', prod.id);
      if (!error) updatedProducts++;
    }
  }

  // 2. Buscar todas as variações
  const { data: variations } = await supabase.from('product_variations').select('id, name, image_url');
  console.log('\nTotal de variações para verificar:', variations ? variations.length : 0);

  let updatedVariations = 0;

  for (const v of (variations || [])) {
    if (!v.image_url || typeof v.image_url !== 'string') continue;

    const urls = v.image_url.split(',').map(s => s.trim()).filter(Boolean);
    let hasChanges = false;
    const newUrls = [];

    for (const imgUrl of urls) {
      if (imgUrl.includes('supabase.co')) {
        try {
          const fileName = imgUrl.split('/').pop().split('?')[0];
          const res = await fetch(imgUrl);
          
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const contentType = res.headers.get('content-type') || 'image/jpeg';

            const uploadRes = await fetch('https://ecommercemoveismorante.vercel.app/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName, contentType })
            });

            if (uploadRes.ok) {
              const { uploadUrl, fileUrl } = await uploadRes.json();
              await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: buffer });
              console.log('-> Migrado Variação:', v.name ? v.name.substring(0, 25) : v.id, '=>', fileUrl);
              newUrls.push(fileUrl);
              hasChanges = true;
              continue;
            }
          }

          const fallbackR2Url = `${R2_PUBLIC_URL}/${fileName}`;
          newUrls.push(fallbackR2Url);
          hasChanges = true;
        } catch (err) {
          console.error('Erro ao migrar variação:', err.message);
          newUrls.push(imgUrl);
        }
      } else {
        newUrls.push(imgUrl);
      }
    }

    if (hasChanges) {
      const { error } = await supabase.from('product_variations').update({ image_url: newUrls.join(',') }).eq('id', v.id);
      if (!error) updatedVariations++;
    }
  }

  console.log('\n=== MIGRAÇÃO CONCLUÍDA ===');
  console.log('Produtos Atualizados:', updatedProducts);
  console.log('Variações Atualizadas:', updatedVariations);
}

migrateImages();
