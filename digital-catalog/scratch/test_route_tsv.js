const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

const supabase = createClient(supabaseUrl, supabaseKey);

function formatTsvValue(val) {
  if (val === null || val === undefined) return ""
  let str = String(val).trim()
  
  // Remove tabulações internas que quebrariam as colunas do TSV
  str = str.replace(/\t/g, " ")
  
  // Substitui quebras de linha por <br> para manter a formatação visual na Meta sem quebrar a estrutura do arquivo TSV
  str = str.replace(/[\r\n]+/g, "<br>")
  
  // Se contiver aspas, envolve em aspas duplas e escapa aspas internas
  if (/[#"]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function run() {
  console.log("Simulando geração da rota tsv...");
  const { data: products, error } = await supabase
    .from("products")
    .select("*, product_categories(categories(name, type)), product_images(*), product_variations(*)")
    .is("deleted_at", null)
    .eq("status", "published");

  if (error) {
    console.error(error);
    return;
  }

  const headers = [
    "id", "title", "description", "link", "image_link", "additional_image_link",
    "availability", "rich_text_description", "price", "sale_price", "brand",
    "condition", "color", "gender", "material", "size", "item_group_id",
    "identifier_exists", "quantity_to_sell_on_facebook", "product_type"
  ];

  const rows = [];
  const origin = "https://moveismorante.com.br";

  for (const p of products) {
    const parentCategories = p.product_categories
      ?.map((pc) => pc.categories)
      .filter((cat) => cat && cat.type === "category")
      .map((cat) => cat.name)
      .filter(Boolean) || [];

    const googleCat = parentCategories.join(" > ") || "Furniture";
    const allImages = p.product_images?.map((img) => img.image_url).filter(Boolean) || [];
    const parentImage = allImages[0] || "";
    const additionalImages = allImages.slice(1).join(",");

    const priceFormatted = `${Number(p.price).toFixed(2)} BRL`;
    const salePriceFormatted = p.promo_price ? `${Number(p.promo_price).toFixed(2)} BRL` : "";

    if (p.product_variations && p.product_variations.length > 0) {
      for (const v of p.product_variations) {
        const varPrice = v.use_parent_price !== false ? p.price : (v.price || p.price);
        const varPromo = v.use_parent_promo_price !== false ? p.promo_price : v.promo_price;
        const varDesc = v.use_parent_description !== false ? p.description : (v.description || p.description);
        const varName = v.use_parent_name !== false ? p.name : (v.name || p.name);

        const color = v.attributes?.Cor || v.attributes?.cor || "";
        const size = v.attributes?.Tamanho || v.attributes?.tamanho || "";

        let varImageLink = parentImage;
        let varAdditionalImages = additionalImages;

        if (v.image_url) {
          const varImagesList = v.image_url.split(",").map((url) => url.trim()).filter(Boolean);
          if (varImagesList.length > 0) {
            varImageLink = varImagesList[0];
            varAdditionalImages = varImagesList.slice(1).join(",");
          }
        }

        rows.push([
          v.sku || v.id,
          varName,
          varDesc,
          `${origin}/produto/${p.slug}?var=${v.id}`,
          varImageLink,
          varAdditionalImages,
          v.stock > 0 ? "in stock" : "out of stock",
          varDesc,
          `${Number(varPrice).toFixed(2)} BRL`,
          varPromo ? `${Number(varPromo).toFixed(2)} BRL` : "",
          "Móveis Morante",
          "new",
          color,
          "unisex",
          p.material || "",
          size,
          "",
          "no",
          String(v.stock || 0),
          googleCat
        ]);
      }
    } else {
      rows.push([
        p.id,
        p.name,
        p.description,
        `${origin}/produto/${p.slug}`,
        parentImage,
        additionalImages,
        "in stock",
        p.description,
        priceFormatted,
        salePriceFormatted,
        "Móveis Morante",
        "new",
        "",
        "unisex",
        p.material || "",
        "",
        "",
        "no",
        "10",
        googleCat
      ]);
    }
  }

  const tsvContent = [
    headers.join("\t"),
    ...rows.map(row => row.map(formatTsvValue).join("\t"))
  ].join("\n");

  fs.writeFileSync(path.join(__dirname, 'output.tsv'), tsvContent, 'utf-8');
  console.log("Arquivo output.tsv gerado com sucesso.");

  // Agora vamos testar ler o TSV gerado linha por linha
  const lines = tsvContent.split('\n');
  let formatErrors = 0;
  let commaImageErrors = 0;

  const imageLinkIndex = headers.indexOf('image_link');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const cols = line.split('\t');
    if (cols.length !== headers.length) {
      console.log(`[ERRO DE FORMATAÇÃO] Linha ${i} tem ${cols.length} colunas (esperado ${headers.length})`);
      formatErrors++;
    } else {
      const imageLink = cols[imageLinkIndex] || "";
      if (imageLink.includes(",")) {
        console.log(`[ERRO DE VÍRGULA NA IMAGEM] Linha ${i} | ID: ${cols[0]} | URL: ${imageLink}`);
        commaImageErrors++;
      }
    }
  }

  console.log(`Total de erros de quebra de linha: ${formatErrors}`);
  console.log(`Total de erros de múltiplas URLs no image_link: ${commaImageErrors}`);
}

run();
