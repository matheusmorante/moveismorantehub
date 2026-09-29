const fs = require('fs');
const path = 'erp/src/pages/App/Stock/LabelPrinting/components/ProductSearchInput.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /\.select\(LABEL_VARIATION_COLUMNS\)\s*\n\s*\.is\('merged_to_variation_id', null\)/,
  ".select(LABEL_VARIATION_COLUMNS.replace('products(', 'products!inner('))\n            .is('merged_to_variation_id', null)\n            .or('product_kind.eq.normal,product_kind.is.null', { foreignTable: 'products' })"
);

fs.writeFileSync(path, c);
console.log('Variations updated');
