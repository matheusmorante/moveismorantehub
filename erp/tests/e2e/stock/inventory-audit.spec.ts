/**
 * Suíte E2E Playwright — Inventário e Auditoria
 * Morante Hub ERP
 *
 * Cobertura:
 * 1. Inventário Geral: Criação, validação de "Sem fornecedor", contagem Manual e Scanner, Revisão e Conclusão.
 * 2. Inventário Personalizado: Adição manual de itens sem produto, ProductAutocomplete (texto verde e check), e fechamento sem salvar rascunho.
 */

import { test, expect } from '@playwright/test';

const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';

test.describe('Módulo de Estoque - Inventário e Auditoria', () => {
    const testRunId = `[TESTE_AUT]_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let consoleErrors: string[] = [];
    let pageErrors: string[] = [];

    test.beforeEach(async ({ page }) => {
        consoleErrors = [];
        pageErrors = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.log('CONSOLE ERROR:', msg.text());
                consoleErrors.push(msg.text());
            }
        });

        page.on('pageerror', (err) => {
            console.log('PAGE ERROR:', err.message);
            pageErrors.push(err.message);
        });
    });

    test.afterEach(async () => {
        const criticalConsoleErrors = consoleErrors.filter(
            (msg) =>
                !msg.includes('favicon') &&
                !msg.includes('React DevTools') &&
                !msg.includes('net::ERR_FAILED') &&
                !msg.includes('Failed to load resource')
        );

        expect(criticalConsoleErrors, 'Erros críticos de console detectados').toEqual([]);
        expect(pageErrors, 'Exceções não tratadas detectadas').toEqual([]);
    });

    test('1. Inventário Geral: Criação, Scanner, Manual, Revisão e Encerramento', async ({ page }) => {
        // Go to stock page, inventory tab
        await page.goto(`/estoque/inventarios?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });

        // Clicar em Novo inventário
        await page.click('button:has-text("Novo inventário")');
        
        // Modal de escopo abre. Selecionar "Inventário Geral" (já deve ser default)
        await page.waitForSelector('text=Novo Inventário');
        
        // Digitar nome com testRunId
        await page.fill('input[placeholder="Ex: Contagem mensal da Loja 1"]', `Inventário Geral ${testRunId}`);
        
        // Clicar no responsável e selecionar o primeiro
        await page.click('button:has-text("Selecione um responsável")');
        await page.click('[role="dialog"] button:has-text("Matheus Morante")'); // Ou tenta selecionar o admin
        
        // Confirmar e iniciar
        await page.click('button:has-text("Confirmar e Iniciar")');

        // Na tela de Operação (se tiver etapas)
        // Validar que a etapa "Sem fornecedor" NÃO existe.
        const stagesText = await page.textContent('body');
        expect(stagesText).not.toContain('Sem fornecedor');

        // Se houver etapas, clica na primeira para iniciar
        const firstStageButton = page.locator('button:has-text("Iniciar Contagem")').first();
        if (await firstStageButton.isVisible()) {
            await firstStageButton.click();
        }

        // Deve estar no modo manual por padrão
        await expect(page.locator('button:has-text("Scanner")')).toBeVisible();

        // Alterar para modo scanner
        await page.click('button:has-text("Scanner")');
        
        // Validar interface do scanner
        await expect(page.locator('text=Aguardando leitura do código de barras')).toBeVisible();

        // Voltar para manual
        await page.click('button:has-text("Manual")');

        // Incrementar primeiro item (se existir)
        const plusButton = page.locator('button i.bi-plus').first();
        if (await plusButton.isVisible()) {
            await plusButton.click(); // +1
        }

        // Revisão
        await page.click('button:has-text("Revisar Contagem")');
        await expect(page.locator('text=Revisão do Inventário')).toBeVisible();

        // Concluir
        // Pode ser "Finalizar Inventário" ou "Concluir Inventário"
        await page.click('button:has-text("Concluir Inventário"), button:has-text("Finalizar")');
        
        // Deve fechar o modal
        await expect(page.locator('text=Revisão do Inventário')).not.toBeVisible();
    });

    test('2. Inventário Personalizado: Adição Dinâmica, Autocomplete Verde, e Fechamento (X)', async ({ page }) => {
        await page.goto(`/estoque/inventarios?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });

        await page.click('button:has-text("Novo inventário")');
        await page.waitForSelector('text=Novo Inventário');

        // Selecionar Personalizado
        await page.click('button:has-text("Personalizado")');
        

        
        await page.click('button:has-text("Selecione um responsável")');
        await page.click('[role="dialog"] button:has-text("Matheus Morante")');
        
        await page.click('button:has-text("Confirmar e Iniciar")');

        // Na tela de Operação, validar barra de busca escondida
        await expect(page.locator('input[placeholder="Buscar item..."]')).not.toBeVisible();

        // Adicionar Item Vazio
        await page.click('button:has-text("Adicionar Item")');

        // Deve aparecer o Autocomplete
        const autocompleteInput = page.locator('input[placeholder="Pesquisar produto..."]');
        await expect(autocompleteInput).toBeVisible();

        // Pesquisar um produto qualquer (ex: camisa)
        await autocompleteInput.fill('teste');
        await page.waitForTimeout(500); // debounce do autocomplete
        
        // Selecionar a primeira sugestão
        const firstSuggestion = page.locator('.absolute.z-50 button').first();
        if (await firstSuggestion.isVisible()) {
            await firstSuggestion.click();
            
            // Após selecionar, deve ficar verde e ter o checkmark
            const greenText = page.locator('.text-emerald-600, .dark\\:text-emerald-400');
            await expect(greenText).toBeVisible();
            const checkMark = page.locator('.bi-check-circle-fill.text-emerald-500');
            await expect(checkMark).toBeVisible();
        }

        // Testar Fechamento para validar o modal de aviso e fechar sem salvar rascunho
        await page.click('button:has-text("Cancelar")');
        await page.waitForSelector('text=Deseja salvar como rascunho?');
        await page.click('button:has-text("Não, descartar contagem")');

        // O modal deve fechar sem erro na página
        await expect(page.locator('text=Novo Inventário')).not.toBeVisible();
    });

    test('3. Inventário: Salvar como Rascunho', async ({ page }) => {
        await page.goto(`/estoque/inventarios?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.click('button:has-text("Novo inventário")');
        await page.waitForSelector('text=Novo Inventário');

        await page.click('button:has-text("Selecione um responsável")');
        await page.click('[role="dialog"] button:has-text("Matheus Morante")');
        await page.click('button:has-text("Confirmar e Iniciar")');

        const btnSaveDraft = page.locator('button:has-text("Salvar como rascunho")');
        await expect(btnSaveDraft).toBeDisabled();

        const plusButton = page.locator('button i.bi-plus').first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
            await expect(btnSaveDraft).toBeEnabled();
            
            await btnSaveDraft.click();
            await page.waitForTimeout(500);
        }

        await page.click('button:has-text("Cancelar")');
        const warningModal = page.locator('text=Deseja salvar como rascunho?');
        if (await warningModal.isVisible()) {
            await page.click('button:has-text("Não, descartar contagem")');
        }
        await expect(page.locator('text=Novo Inventário')).not.toBeVisible();
    });

    test('4. Inventário: Desfazer e Aplicar Ajuste', async ({ page }) => {
        await page.goto(`/estoque/inventarios?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        
        const threeDots = page.locator('button:has(i.bi-three-dots-vertical)').first();
        if (await threeDots.isVisible()) {
            await threeDots.click();
            
            const undoBtn = page.locator('button:has-text("Desfazer inventário")');
            if (await undoBtn.isVisible()) {
                await undoBtn.click();
                await page.waitForSelector('text=Desfazer Inventário');
                
                const confirmBtn = page.locator('button', { hasText: /Confirmar|Aguarde/ }).last();
                await expect(confirmBtn).toBeDisabled();
                
                await page.waitForTimeout(3500);
                await expect(confirmBtn).toBeEnabled();
                await confirmBtn.click();
                
                await expect(page.locator('text=Desfazer Inventário')).not.toBeVisible();
            }
        }
    });
});
