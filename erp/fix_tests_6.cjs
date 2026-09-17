const fs = require('fs');
let content = fs.readFileSync('tests/e2e/products/products-variations-e2e.spec.ts', 'utf8');

content = content.replace(/page\.locator\('table tbody tr'\)/g, "page.locator('div[role=\"dialog\"] table tbody tr')");
content = content.replace(/page\.locator\('table tbody tr button\[title\*=\"Excluir\"\], table tbody tr button i\.bi-trash'\)/g, "page.locator('div[role=\"dialog\"] table tbody tr button[title*=\"Excluir\"], div[role=\"dialog\"] table tbody tr button i.bi-trash')");

fs.writeFileSync('tests/e2e/products/products-variations-e2e.spec.ts', content);
