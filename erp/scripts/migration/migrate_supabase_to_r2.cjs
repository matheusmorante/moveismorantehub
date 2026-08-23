const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const supabase = createClient(
  'https://hkoxhourxwlddgsfdgws.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI'
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: 'https://57223c6866eff074ea23c53713031e60.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '294ae2d9aec3c5aef4dec5e72ea83816',
    secretAccessKey: 'f1960234d719d18a5f1acefc4b11dc63056ba0cacc3be4593c0d455f562c87a7'
  },
  forcePathStyle: true
});

const R2_BUCKET = 'productsimages';
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
      
      // Se for imagem do Supabase, migra para o R2
      if (imgUrl.includes('supabase.co')) {
        try {
          const fileName = imgUrl.split('/').pop().split('?')[0];
          console.log('Baixando do Supabase:', fileName);

          const res = await fetch(imgUrl);
          if (!res.ok) {
            console.warn('Falha ao baixar:', res.status, imgUrl);
            newImages.push(imgUrl);
            continue;
          }

          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = res.headers.get('content-type') || 'image/jpeg';

          // Upload para o Cloudflare R2
          await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: fileName,
            Body: buffer,
            ContentType: contentType
          }));

          const r2Url = `${R2_PUBLIC_URL}/${fileName}`;
          console.log('-> Migrado para R2:', r2Url);
          newImages.push(r2Url);
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
      else console.error('Erro ao atualizar produto no banco:', error);
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
          console.log('Baixando Variação:', fileName);

          const res = await fetch(imgUrl);
          if (!res.ok) {
            newUrls.push(imgUrl);
            continue;
          }

          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = res.headers.get('content-type') || 'image/jpeg';

          await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: fileName,
            Body: buffer,
            ContentType: contentType
          }));

          const r2Url = `${R2_PUBLIC_URL}/${fileName}`;
          console.log('-> Variação Migrada para R2:', r2Url);
          newUrls.push(r2Url);
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
