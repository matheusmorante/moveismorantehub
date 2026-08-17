const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Analisando as URLs das imagens no banco de dados...");
  
  // Buscar imagens
  const { data: images, error: err1 } = await supabase
    .from('product_images')
    .select('product_id, image_url, is_main');

  if (err1) {
    console.error("Erro ao buscar product_images:", err1);
    return;
  }

  // Buscar variações
  const { data: variations, error: err2 } = await supabase
    .from('product_variations')
    .select('id, product_id, sku, name, image_url');

  if (err2) {
    console.error("Erro ao buscar product_variations:", err2);
    return;
  }

  console.log(`Total de registros em product_images: ${images.length}`);
  console.log(`Total de registros em product_variations: ${variations.length}`);

  console.log("\n--- Exemplos de URLs em product_images ---");
  images.slice(0, 10).forEach(img => {
    console.log(`ProdID: ${img.product_id} | Main: ${img.is_main} | URL: ${img.image_url}`);
  });

  console.log("\n--- Analisando imagens com formato incomum em product_images ---");
  let unusualImages = 0;
  for (const img of images) {
    if (!img.image_url) {
      console.log(`[VAZIA] ProdID: ${img.product_id} | is_main: ${img.is_main}`);
      unusualImages++;
    } else if (!img.image_url.startsWith('http://') && !img.image_url.startsWith('https://')) {
      console.log(`[NÃO-HTTP] ProdID: ${img.product_id} | URL: ${img.image_url}`);
      unusualImages++;
    } else if (img.image_url.includes('placeholder') || img.image_url.includes('wixstatic') || img.image_url.includes('static')) {
      console.log(`[SPECIAL/EXTERNAL] ProdID: ${img.product_id} | URL: ${img.image_url}`);
    }
  }

  console.log("\n--- Analisando imagens em product_variations ---");
  let unusualVarImages = 0;
  for (const v of variations) {
    if (v.image_url) {
      if (!v.image_url.startsWith('http://') && !v.image_url.startsWith('https://')) {
        console.log(`[NÃO-HTTP VAR] VarID: ${v.id} | SKU: ${v.sku} | URL: ${v.image_url}`);
        unusualVarImages++;
      } else if (v.image_url.includes(',')) {
        console.log(`[MÚLTIPLAS IMAGENS NA VARIAÇÃO] VarID: ${v.id} | SKU: ${v.sku} | URL: ${v.image_url}`);
      }
    }
  }

  console.log(`\nResumo: Incomuns em product_images: ${unusualImages}, Incomuns em variações: ${unusualVarImages}`);
}

run();
