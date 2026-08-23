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

async function uploadAllImagesToR2() {
  console.log('--- INICIANDO UPLOAD COMPLETO DE MÍDIAS PARA O CLOUDFLARE R2 ---');

  const { data: products } = await supabase.from('products').select('id, name, images');
  console.log('Total de produtos para processar:', products ? products.length : 0);

  let totalUploaded = 0;

  for (const prod of (products || [])) {
    if (!Array.isArray(prod.images) || prod.images.length === 0) continue;

    let hasChanges = false;
    const newImages = [];

    for (const imgUrl of prod.images) {
      if (!imgUrl || typeof imgUrl !== 'string') continue;

      const fileName = imgUrl.split('/').pop().split('?')[0];
      const r2TargetUrl = `${R2_PUBLIC_URL}/${fileName}`;

      // Verificar se a imagem já responde 200 no R2
      try {
        const checkRes = await fetch(r2TargetUrl, { method: 'HEAD' });
        if (checkRes.status === 200) {
          newImages.push(r2TargetUrl);
          if (imgUrl !== r2TargetUrl) hasChanges = true;
          continue;
        }
      } catch (e) {}

      // Se não existir no R2, baixa do Supabase e faz upload para o R2
      try {
        console.log(`[Upload R2] Baixando: ${fileName}`);
        const downloadRes = await fetch(imgUrl);
        if (!downloadRes.ok) {
          console.warn(`[Aviso] Não foi possível baixar ${imgUrl} (${downloadRes.status})`);
          newImages.push(imgUrl);
          continue;
        }

        const arrayBuffer = await downloadRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let contentType = downloadRes.headers.get('content-type') || 'image/jpeg';
        if (fileName.endsWith('.png')) contentType = 'image/png';
        if (fileName.endsWith('.webp')) contentType = 'image/webp';

        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: fileName,
          Body: buffer,
          ContentType: contentType
        }));

        console.log(`✓ [Sucesso] Gravado no R2: ${r2TargetUrl}`);
        newImages.push(r2TargetUrl);
        hasChanges = true;
        totalUploaded++;
      } catch (err) {
        console.error(`Erro ao enviar ${fileName} para o R2:`, err.message);
        newImages.push(imgUrl);
      }
    }

    if (hasChanges) {
      await supabase.from('products').update({ images: newImages }).eq('id', prod.id);
    }
  }

  // Variações
  const { data: variations } = await supabase.from('product_variations').select('id, name, image_url');
  console.log('\nTotal de variações para processar:', variations ? variations.length : 0);

  for (const v of (variations || [])) {
    if (!v.image_url || typeof v.image_url !== 'string') continue;

    const urls = v.image_url.split(',').map(s => s.trim()).filter(Boolean);
    let hasChanges = false;
    const newUrls = [];

    for (const imgUrl of urls) {
      const fileName = imgUrl.split('/').pop().split('?')[0];
      const r2TargetUrl = `${R2_PUBLIC_URL}/${fileName}`;

      try {
        const checkRes = await fetch(r2TargetUrl, { method: 'HEAD' });
        if (checkRes.status === 200) {
          newUrls.push(r2TargetUrl);
          if (imgUrl !== r2TargetUrl) hasChanges = true;
          continue;
        }
      } catch (e) {}

      try {
        console.log(`[Upload R2 Variação] Baixando: ${fileName}`);
        const downloadRes = await fetch(imgUrl);
        if (!downloadRes.ok) {
          newUrls.push(imgUrl);
          continue;
        }

        const arrayBuffer = await downloadRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let contentType = downloadRes.headers.get('content-type') || 'image/jpeg';
        if (fileName.endsWith('.png')) contentType = 'image/png';
        if (fileName.endsWith('.webp')) contentType = 'image/webp';

        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: fileName,
          Body: buffer,
          ContentType: contentType
        }));

        console.log(`✓ [Sucesso] Variação no R2: ${r2TargetUrl}`);
        newUrls.push(r2TargetUrl);
        hasChanges = true;
        totalUploaded++;
      } catch (err) {
        console.error(`Erro ao enviar variação ${fileName}:`, err.message);
        newUrls.push(imgUrl);
      }
    }

    if (hasChanges) {
      await supabase.from('product_variations').update({ image_url: newUrls.join(',') }).eq('id', v.id);
    }
  }

  console.log(`\n=== UPLOAD FÍSICO CONCLUÍDO ===`);
  console.log(`Total de novas imagens gravadas no R2: ${totalUploaded}`);
}

uploadAllImagesToR2();
