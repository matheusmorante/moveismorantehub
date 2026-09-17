const fs = require('fs');
let content = fs.readFileSync('tests/e2e/products/products-variations-e2e.spec.ts', 'utf8');

const oldLogic = `        // Navega para a aba de variações clicando no botão Próxima etapa (se disponível) ou na tab Variações
        if (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
            await page.locator('button:has-text("Próxima etapa")').click();
        } else {
            await page.locator('button', { hasText: /^Variações$/ }).first().click();
        }`;

const newLogic = `        // Navega para a aba de variações
        await page.locator('button', { hasText: /^Variações$/ }).first().click();`;

content = content.replaceAll(oldLogic, newLogic);

fs.writeFileSync('tests/e2e/products/products-variations-e2e.spec.ts', content);
