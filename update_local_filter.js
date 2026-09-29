const fs = require('fs');
const path = 'erp/src/pages/App/Stock/LabelPrinting/components/ProductSearchInput.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/const localFiltered = \(products \|\| \[\]\)\.filter\(\(p\) => \{\n\s*const pTitle/, "const localFiltered = (products || []).filter((p) => {\n      if (p.product_kind && p.product_kind !== 'normal') return false;\n      const pTitle");

fs.writeFileSync(path, c);
console.log('Local filtered updated');
