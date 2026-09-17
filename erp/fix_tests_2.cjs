const fs = require('fs');
let content = fs.readFileSync('tests/e2e/products/products-variations-e2e.spec.ts', 'utf8');

const submitLogic = `
        while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
            await page.locator('button:has-text("Próxima etapa")').click();
        }
        await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();`;

// The script replaced `await page.locator('button:has-text("Cadastrar produto")...`
// Let's replace those lines back.

content = content.replace(/await page\.locator\('button:has-text\("Cadastrar produto"\), button:has-text\("Salvar alterações"\)'\)\.first\(\)\.click\(\);/g, submitLogic.trim());
content = content.replace(/await page\.locator\('button:has-text\("Cadastrar produto"\), button:has-text\("Salvar alterações"\), button:has-text\("Concluir"\)'\)\.first\(\)\.click\(\);/g, submitLogic.trim());

fs.writeFileSync('tests/e2e/products/products-variations-e2e.spec.ts', content);
