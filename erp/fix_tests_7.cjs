const fs = require('fs');
let content = fs.readFileSync('tests/e2e/products/products-variations-e2e.spec.ts', 'utf8');

const target1 = `        // Navega para a aba de variações
        const variationsTabBtn = page.locator('button:has-text("Variações")').first();
        await variationsTabBtn.click();`;

const replacement1 = `        // Navega para a aba de variações clicando no botão Próxima etapa (se disponível) ou na tab Variações
        if (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
            await page.locator('button:has-text("Próxima etapa")').click();
        } else {
            await page.locator('button', { hasText: /^Variações$/ }).first().click();
        }`;

content = content.replace(target1, replacement1);

// E para o caso 2:
const target2 = `        // Navega para a aba de variações
        const variationsTabBtn = page.locator('button:has-text("Variações")').first();
        await variationsTabBtn.click();`;

// replace All para pegar os dois
content = content.replaceAll(target1, replacement1);

fs.writeFileSync('tests/e2e/products/products-variations-e2e.spec.ts', content);
