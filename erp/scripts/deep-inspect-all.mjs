import fs from 'fs';

const products = JSON.parse(fs.readFileSync('erp/scripts/target_products_data.json', 'utf8'));

const out = [];

for (const p of products) {
  const specs = p.technical_specs || {};
  const techVals = specs.technicalValues || {};

  out.push({
    id: p.id,
    name: p.name,
    categoryNames: p.categoryNames,
    width: p.width,
    height: p.height,
    depth: p.depth,
    measures: p.measures,
    brand: p.brand,
    line: p.line,
    images: p.images,
    variations: (p.variations || []).map(v => ({ id: v.id, name: v.name, sku: v.sku, attributes: v.attributes })),
    techVals,
    description: p.description
  });
}

fs.writeFileSync('erp/scripts/target_products_full_inspection.json', JSON.stringify(out, null, 2));
console.log('Saved target_products_full_inspection.json with', out.length, 'products');
