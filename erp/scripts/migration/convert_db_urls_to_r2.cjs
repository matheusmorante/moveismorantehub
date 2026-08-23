const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hkoxhourxwlddgsfdgws.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI'
);

const R2_PUBLIC_URL = 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev';

async function updateDbUrlsToR2() {
  console.log('--- CONVERTENDO TODAS AS URLS DO BANCO PARA CLOUDFLARE R2 ---');
  
  const { data: products } = await supabase.from('products').select('id, name, images');
  let count = 0;

  for (const p of (products || [])) {
    if (Array.isArray(p.images) && p.images.length > 0) {
      let hasChanges = false;
      const newImages = p.images.map(img => {
        if (typeof img === 'string' && img.includes('supabase.co')) {
          hasChanges = true;
          const fileName = img.split('/').pop().split('?')[0];
          return R2_PUBLIC_URL + '/' + fileName;
        }
        return img;
      });

      if (hasChanges) {
        const { error } = await supabase.from('products').update({ images: newImages }).eq('id', p.id);
        if (!error) count++;
      }
    }
  }

  const { data: vars } = await supabase.from('product_variations').select('id, image_url');
  let varCount = 0;

  for (const v of (vars || [])) {
    if (typeof v.image_url === 'string' && v.image_url.includes('supabase.co')) {
      const urls = v.image_url.split(',').map(s => s.trim()).filter(Boolean);
      const newUrls = urls.map(img => {
        if (img.includes('supabase.co')) {
          const fileName = img.split('/').pop().split('?')[0];
          return R2_PUBLIC_URL + '/' + fileName;
        }
        return img;
      });
      const { error } = await supabase.from('product_variations').update({ image_url: newUrls.join(',') }).eq('id', v.id);
      if (!error) varCount++;
    }
  }

  console.log('--- RESULTADO ---');
  console.log('Produtos convertidos:', count);
  console.log('Variações convertidas:', varCount);
}

updateDbUrlsToR2();
