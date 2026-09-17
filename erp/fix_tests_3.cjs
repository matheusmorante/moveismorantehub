const fs = require('fs');
let content = fs.readFileSync('tests/e2e/products/products-variations-e2e.spec.ts', 'utf8');

const oldLogic = `        while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
            await page.locator('button:has-text("Próxima etapa")').click();
        }
        await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();`;

const newLogic = `        while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
            await page.locator('button:has-text("Próxima etapa")').click();
        }
        await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
        await expect(page.locator('text="salvo com sucesso"').first()).toBeVisible({ timeout: 15000 });`;

// Use string replacement instead of regex to avoid whitespace issues
content = content.replaceAll(oldLogic, newLogic);

fs.writeFileSync('tests/e2e/products/products-variations-e2e.spec.ts', content);
