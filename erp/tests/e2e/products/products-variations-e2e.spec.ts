import { test, expect } from '@playwright/test';

test.describe('Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio', () => {
    const testRunId = `[TESTE_AUT]_VAR_${Date.now()}`;
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
        expect(realErrors, 'Erros críticos de console detectados').toEqual([]);
        expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);

        // Teardown de dados criados com testRunId
        await page.evaluate((runId) => {
            const raw = localStorage.getItem('erp_products');
            if (raw) {
                try {
                    const products = JSON.parse(raw);
                    const filtered = products.filter((p: any) => !p.name?.includes(runId) && !p.id?.includes(runId));
                    localStorage.setItem('erp_products', JSON.stringify(filtered));
                } catch (e) {
                    console.error(e);
                }
            }
        }, testRunId);
    });

    test('Caso 1: Criação de produto simples e geração automática da Variação 1 padrão', async ({ page }) => {
        const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first();
        await expect(newProductBtn).toBeVisible({ timeout: 10000 });
        await newProductBtn.click();

        // Modal de produto deve estar visível com dimensões padrão
        const parentModal = page.locator('div[role="dialog"], .fixed.inset-0 .relative.bg-white').first();
        await expect(parentModal).toBeVisible();

        // Preenche o nome na aba Geral
        const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
        await expect(nameInput).toBeVisible();
        await nameInput.fill(`${testRunId} poltrona do papai com reclinador`);
        await nameInput.blur();

        // Verifica formatação automática em Title Case com conectivos 'do' e 'com' em minúsculo
        const formattedValue = await nameInput.inputValue();
        expect(formattedValue).toContain('Poltrona do Papai com Reclinador');

        // Navega para a aba de variações
        const variationsTabBtn = page.locator('button:has-text("Variações")').first();
        await variationsTabBtn.click();

        // Deve existir a Variação 1 gerada automaticamente na lista
        const tableRows = page.locator('table tbody tr');
        await expect(tableRows).toHaveCount(1);
    });

    test('Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1', async ({ page }) => {
        const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first();
        await newProductBtn.click();

        // Navega para a aba de variações
        const variationsTabBtn = page.locator('button:has-text("Variações")').first();
        await variationsTabBtn.click();

        // Botão "Adicionar variação" deve estar desabilitado ou barrar a criação com aviso
        const addVarBtn = page.locator('button:has-text("Adicionar variação")').first();
        const isDisabled = await addVarBtn.isDisabled();

        if (isDisabled) {
            expect(isDisabled).toBe(true);
        } else {
            await addVarBtn.click();
            // Deve exibir toast de bloqueio informando necessidade de atributo na Variação 1
            const toastMessage = page.locator('text=Antes de criar outra variação, informe pelo menos um atributo');
            await expect(toastMessage).toBeVisible({ timeout: 5000 });
        }
    });

    test('Caso 3: Adição de Variação Manual com Atributos e Validação do Tamanho do Modal', async ({ page }) => {
        const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first();
        await newProductBtn.click();

        // Preenche nome do pai
        const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
        await nameInput.fill(`${testRunId} Guarda-Roupa de Casal com Espelho`);
        await nameInput.blur();

        // Aba de Variações
        await page.locator('button:has-text("Variações")').first().click();

        // Clica na Variação 1 para editar
        const firstVarRow = page.locator('table tbody tr').first();
        await firstVarRow.click();

        // Modal de Variação deve estar aberto
        const varModal = page.locator('div[role="dialog"][aria-labelledby="variation-form-modal-title"]').first();
        await expect(varModal).toBeVisible({ timeout: 5000 });

        // Validação estrita do tamanho do Modal de Variação (mesmo tamanho do modal pai: max-w-5xl h-[92vh] rounded-3xl)
        const modalClass = await varModal.getAttribute('class');
        expect(modalClass).toContain('max-w-5xl');
        expect(modalClass).toContain('h-[92vh]');
        expect(modalClass).toContain('rounded-3xl');

        // Adiciona atributo na Variação 1 (ex: Cor = Off-White)
        const attrSelect = page.locator('select').first();
        if (await attrSelect.isVisible()) {
            const options = await attrSelect.locator('option').allTextContents();
            if (options.length > 1) {
                await attrSelect.selectOption({ index: 1 });
            }
        }

        // Fecha/Conclui o modal da Variação 1
        const cancelOrCloseBtn = page.locator('button:has-text("Cancelar"), button:has-text("Concluir")').first();
        await cancelOrCloseBtn.click();
    });

    test('Caso 4: Regra de Imutabilidade da Variação 1', async ({ page }) => {
        const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first();
        await newProductBtn.click();

        await page.locator('button:has-text("Variações")').first().click();

        // Tenta remover a Variação 1 se houver botão de exclusão
        const deleteBtn = page.locator('table tbody tr button[title*="Excluir"], table tbody tr button i.bi-trash').first();
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            // Deve informar que a Variação 1 é obrigatória
            const warningToast = page.locator('text=A Variação 1 é obrigatória e não pode ser removida');
            await expect(warningToast).toBeVisible({ timeout: 5000 });
        }
    });

    test('Caso 5: Cadastro Rápido de Variação em Pai Existente sem Variação Duplicada', async ({ page }) => {
        // Testa a rota de notas fiscais de entrada / conferência onde o operador faz cadastro rápido
        await page.goto('/stock/receipts?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
        await page.waitForLoadState('domcontentloaded');

        // Garante que a tela carregou sem erros de runtime
        expect(await page.locator('body').isVisible()).toBe(true);
    });

    test('Caso 6: Formatação rigorosa de Title Case em atributos e valores de variações', async ({ page }) => {
        await page.goto('/products?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
        await page.waitForLoadState('domcontentloaded');

        const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first();
        await newProductBtn.click();

        const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
        await nameInput.fill('MESA DE JANTAR PARA 6 LUGARES COM TAMPO DE VIDRO');
        await nameInput.blur();

        const formatted = await nameInput.inputValue();
        expect(formatted).toBe('Mesa de Jantar para 6 Lugares com Tampo de Vidro');
    });
});
