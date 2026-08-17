const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Buscando produtos e suas imagens...");
  const { data: products, error } = await supabase
    .from('products')
    .select('*, product_categories(categories(name, type)), product_images(*), product_variations(*)')
    .is('deleted_at', null)
    .eq('status', 'published');

  if (error) {
    console.error("Erro:", error);
    return;
  }

  let totalFeedItems = 0;
  let missingImageItems = [];

  for (const p of products) {
    const allImages = p.product_images?.map((img) => img.image_url).filter(Boolean) || [];
    const parentImage = allImages[0] || "";

    if (p.product_variations && p.product_variations.length > 0) {
      for (const v of p.product_variations) {
        totalFeedItems++;
        const varImageLink = v.image_url || parentImage;
        if (!varImageLink) {
          missingImageItems.push({
            type: 'variation',
            productId: p.id,
            productName: p.name,
            variationId: v.id,
            variationSku: v.sku,
            parentImagesCount: allImages.length
          });
        }
      }
    } else {
      totalFeedItems++;
      if (!parentImage) {
        missingImageItems.push({
          type: 'parent',
          productId: p.id,
          productName: p.name,
          parentImagesCount: allImages.length
        });
      }
    }
  }

  console.log(`\nTotal de itens que seriam gerados no feed: ${totalFeedItems}`);
  console.log(`Itens sem imagem no feed: ${missingImageItems.length}`);
  
  if (missingImageItems.length > 0) {
    console.log("\nDetalhes dos itens sem imagem:");
    console.log(JSON.stringify(missingImageItems, null, 2));
  }
}

run();
