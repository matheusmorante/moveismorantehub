import fs from 'fs';

const SUPABASE_URL = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json'
};

async function main() {
  const targetCategoryIds = [
    'ba076524-c8f1-494e-a055-cf5881c4d906', // Balcões para Pia
    '4fd92708-2390-4a35-bd54-fbd513ec6677', // Cômodas
    'b3a1a235-fd4c-4706-a058-6f8200b3731a', // Cozinhas Moduladas e Compactas
    '1859e792-0790-4554-b269-e3b0b707896e'  // Guarda-Roupas
  ];

  // 1. Fetch categories
  const catRes = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=id,name,slug`, { headers });
  const categories = await catRes.json();
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  // 2. Fetch product_categories links
  const pcRes = await fetch(`${SUPABASE_URL}/rest/v1/product_categories?select=product_id,category_id`, { headers });
  const productCats = await pcRes.json();
  const productToCats = {};
  for (const pc of productCats) {
    if (!productToCats[pc.product_id]) productToCats[pc.product_id] = [];
    productToCats[pc.product_id].push(pc.category_id);
  }

  // 3. Fetch all active products
  const pRes = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=id,name,category_id,description,technical_specs,images,brand,line,width,depth,height,measures,price,status,deleted,active&deleted=eq.false&limit=1000`,
    { headers }
  );
  const allProducts = await pRes.json();

  // 4. Fetch variations
  const pvRes = await fetch(
    `${SUPABASE_URL}/rest/v1/product_variations?select=id,product_id,name,sku,attributes,active&active=eq.true&limit=2000`,
    { headers }
  );
  const variations = await pvRes.json();
  const variationsByProduct = {};
  for (const v of variations) {
    if (!variationsByProduct[v.product_id]) variationsByProduct[v.product_id] = [];
    variationsByProduct[v.product_id].push(v);
  }

  // Filter products that belong to target categories or whose name clearly matches
  const targetProducts = [];
  for (const p of allProducts) {
    const cats = new Set([
      ...(p.category_id ? [p.category_id] : []),
      ...(productToCats[p.id] || [])
    ]);

    const isTargetCategory = targetCategoryIds.some(cid => cats.has(cid));
    const nameLower = (p.name || '').toLowerCase();
    const isTargetName = /guarda[ -]?roupa|roupeiro|comoda|cômoda|balcao|balcão.*pia|cozinha.*(compacta|modulad)|jogo de cozinha/i.test(nameLower);

    if (isTargetCategory || isTargetName) {
      targetProducts.push({
        ...p,
        categoryNames: Array.from(cats).map(cid => catMap[cid] || cid),
        categoryIds: Array.from(cats),
        variations: variationsByProduct[p.id] || []
      });
    }
  }

  console.log(`Found ${targetProducts.length} target products.`);
  fs.writeFileSync('erp/scripts/target_products_data.json', JSON.stringify(targetProducts, null, 2));
}

main().catch(console.error);
