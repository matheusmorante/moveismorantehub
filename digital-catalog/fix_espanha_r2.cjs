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

async function fixTargetProducts() {
  console.log('--- REPARANDO PRODUTOS INELEGÍVEIS DA META ---');

  // 1. Guarda Roupa Espanha
  const { data: prods } = await supabase.from('products').select('id, name, images');
  for (const p of (prods || [])) {
    if (p.name && p.name.toLowerCase().includes('espanha')) {
      console.log('Fixing product:', p.name);
      const newImages = [];
      for (const imgUrl of (p.images || [])) {
        const fileName = imgUrl.split('/').pop().split('?')[0];
        const r2Url = R2_PUBLIC_URL + '/' + fileName;

        try {
          const downloadRes = await fetch(imgUrl);
          if (downloadRes.ok) {
            const buf = Buffer.from(await downloadRes.arrayBuffer());
            await r2.send(new PutObjectCommand({
              Bucket: R2_BUCKET,
              Key: fileName,
              Body: buf,
              ContentType: downloadRes.headers.get('content-type') || 'image/jpeg'
            }));
            console.log('✓ Enviado para R2:', r2Url);
            newImages.push(r2Url);
          } else {
            newImages.push(imgUrl);
          }
        } catch (e) {
          newImages.push(imgUrl);
        }
      }
      if (newImages.length > 0) {
        await supabase.from('products').update({ images: newImages }).eq('id', p.id);
        console.log('Guarda Roupa Espanha atualizado no Supabase com links do R2!');
      }
    }
  }

  // 2. Variações do Guarda Roupa Espanha
  const { data: vars } = await supabase.from('product_variations').select('id, name, image_url');
  for (const v of (vars || [])) {
    if (v.name && v.name.toLowerCase().includes('espanha') && v.image_url) {
      const urls = v.image_url.split(',').map(s => s.trim()).filter(Boolean);
      const newUrls = [];
      for (const u of urls) {
        const fn = u.split('/').pop().split('?')[0];
        const r2Url = R2_PUBLIC_URL + '/' + fn;
        try {
          const res = await fetch(u);
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            await r2.send(new PutObjectCommand({
              Bucket: R2_BUCKET,
              Key: fn,
              Body: buf,
              ContentType: res.headers.get('content-type') || 'image/jpeg'
            }));
            newUrls.push(r2Url);
          } else newUrls.push(u);
        } catch (e) { newUrls.push(u); }
      }
      await supabase.from('product_variations').update({ image_url: newUrls.join(',') }).eq('id', v.id);
      console.log('Variação Espanha atualizada com R2!');
    }
  }

  console.log('--- REPARO CONCLUÍDO ---');
}

fixTargetProducts();
