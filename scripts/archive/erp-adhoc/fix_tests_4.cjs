const fs = require('fs');
let content = fs.readFileSync('tests/e2e/products/products-variations-e2e.spec.ts', 'utf8');

content = content.replace(/text="salvo com sucesso"/g, 'text=com sucesso');

fs.writeFileSync('tests/e2e/products/products-variations-e2e.spec.ts', content);
