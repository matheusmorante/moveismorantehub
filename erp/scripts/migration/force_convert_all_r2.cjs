const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://hkoxhourxwlddgsfdgws.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI'
);

const R2_PUBLIC_URL = 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev';

async function updateAllProductsAndVariationsToR2() {
  console.log('--- FORÇANDO MIGRAÇÃO DE TODAS AS URLS RESTANTES PARA CLOUDFLARE R2 ---');

  const { data: products } = await supabase.from('products').select('id, images');
  let pCount = 0;

  for (const p of (products || [])) {
    if (Array.isArray(p.images) && p.images.length > 0) {
      let hasSupabase = false;
      const newImages = p.images.map(img => {
        if (typeof img === 'string' && img.includes('supabase.co')) {
          hasSupabase = true;
          const fileName = img.split('/').pop().split('?')[0];
          return `${R2_PUBLIC_URL}/${fileName}`;
        }
        return img;
      });

      if (hasSupabase) {
        const { error } = await supabase.from('products').update({ images: newImages }).eq('id', p.id);
        if (error) console.error('Erro ao salvar produto:', p.id, error.message);
        else pCount++;
      }
    }
  }

  const { data: variations } = await supabase.from('product_variations').select('id, image_url');
  let vCount = 0;

  for (const v of (variations || [])) {
    if (typeof v.image_url === 'string' && v.image_url.includes('supabase.co')) {
      const urls = v.image_url.split(',').map(s => s.trim()).filter(Boolean);
      const newUrls = urls.map(img => {
        if (img.includes('supabase.co')) {
          const fileName = img.split('/').pop().split('?')[0];
          return `${R2_PUBLIC_URL}/${fileName}`;
        }
        return img;
      });
      const { error } = await supabase.from('product_variations').update({ image_url: newUrls.join(',') }).eq('id', v.id);
      if (error) console.error('Erro ao salvar variação:', v.id, error.message);
      else vCount++;
    }
  }

  console.log('--- CONVERSÃO CONCLUÍDA ---');
  console.log('Produtos convertidos:', pCount);
  console.log('Variações convertidas:', vCount);
}

updateAllProductsAndVariationsToR2();
