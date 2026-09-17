const fs = require('fs');
let content = fs.readFileSync('tests/e2e/products/products-variations-e2e.spec.ts', 'utf8');

// The product form uses "Cadastrar produto" or "Salvar alterações".
// The variation form uses "Concluir" (we might want to keep that if it's true, but VariationFormModal was also changed? Let's check.)
content = content.replace(/await page\.locator\('button:has-text\("Concluir"\)'\)\.click\(\);/g, `await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações")').first().click();`);
content = content.replace(/await page\.locator\('button:has-text\("Concluir"\)'\)\.first\(\)\.click\(\);/g, `await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();`);

fs.writeFileSync('tests/e2e/products/products-variations-e2e.spec.ts', content);
