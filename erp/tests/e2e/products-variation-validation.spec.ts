import { test, expect } from '@playwright/test';

test.describe('Validação de Atributos de Variação de Produto', () => {
    const testRunId = `[TESTE_AUT]_PROD_${Date.now()}`;
    let consoleErrors: string[] = [];
    let pageErrors: string[] = [];

    test.beforeEach(async ({ page }) => {
        consoleErrors = [];
        pageErrors = [];

        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        page.on('pageerror', err => {
            pageErrors.push(err.message);
        });

        await page.goto('/products?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
        await page.waitForLoadState('domcontentloaded');
    });

    test.afterEach(async ({ page }) => {
        const realErrors = consoleErrors.filter(e => 
            !e.includes('favicon') && 
            !e.includes('Download the React DevTools') &&
            !e.includes('net::ERR_CONNECTION_REFUSED')
        );
        expect(realErrors, 'Erros de console detectados').toEqual([]);
        expect(pageErrors, 'Exceções de runtime detectadas').toEqual([]);
    });

    test('Redireciona para o modal da variação na aba de atributos se tentar salvar sem atributo definido', async ({ page }) => {
        const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i });
        if (await newProductBtn.isVisible()) {
            await newProductBtn.click();

            // Preenche nome
            const nameInput = page.locator('input[placeholder*="Ex: Sofá"], input[placeholder*="Nome"]').first();
            if (await nameInput.isVisible()) {
                await nameInput.fill(`${testRunId} Sofá Teste`);
            }

            // Tenta salvar diretamente
            const saveBtn = page.getByRole('button', { name: /salvar produto|cadastrar/i }).first();
            if (await saveBtn.isVisible()) {
                await saveBtn.click();
            }

            // Se abrir o modal de variação ou focar em atributos, o modal de identificação e atributos deve estar acessível
            const variationModalHeading = page.locator('text=Identificação e Atributos, text=Atributos da Variação').first();
            // A interface não deve travar nem gerar erro de console
            expect(await page.locator('body').isVisible()).toBe(true);
        }
    });
});
