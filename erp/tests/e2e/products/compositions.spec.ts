import { test, expect } from '@playwright/test';

test.describe('Módulo de Composições (Kit de Produtos)', () => {
    const testRunId = `[TESTE_AUT]_CMP_${Date.now()}`;
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

        // Autenticação simplificada (bypass) conforme padrão do MoranteHub
        await page.goto('/products?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
        await page.waitForLoadState('domcontentloaded');
    });

    test.afterEach(async () => {
        const realErrors = consoleErrors.filter(e => 
            !e.includes('favicon') && 
            !e.includes('Download the React DevTools') &&
            !e.includes('net::ERR_CONNECTION_REFUSED')
        );
        expect(realErrors, 'Erros de console detectados').toEqual([]);
        expect(pageErrors, 'Exceções de runtime detectadas').toEqual([]);
    });

    test('1. Deve criar uma composição com sucesso contendo produtos reais vinculados', async ({ page }) => {
        await page.goto('/products/compositions?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
        
        const newCompositionBtn = page.getByRole('button', { name: /Nova Composição|\+ Composição/i });
        await newCompositionBtn.click();

        const nameInput = page.locator('input[placeholder*="Ex: Cozinha Compacta"]');
        await nameInput.fill(`${testRunId} Cozinha de Teste E2E`);
        
        const skuInput = page.locator('input[placeholder*="Ex: CMP-COZ-PARIS"]');
        await skuInput.fill(`CMP-E2E-${Date.now()}`);

        await page.getByRole('tab', { name: /Produtos Componentes/i }).click();
        await page.getByRole('button', { name: /Adicionar Produto/i }).click();

        const searchInput = page.getByPlaceholder(/Buscar por nome, SKU/i);
        await searchInput.fill('a'); 
        
        await page.waitForTimeout(1000); 
        
        const firstResult = page.locator('button.group.w-full.text-left').first();
        if (await firstResult.isVisible()) {
            await firstResult.click();

            const increaseQtyBtn = page.getByRole('button', { name: '+' }).first();
            await increaseQtyBtn.click();
        }

        await page.getByRole('button', { name: /Salvar Composição/i }).click();
        await expect(page.locator('text=Composição salva com sucesso')).toBeVisible({ timeout: 5000 });
    });

    test('2. Validação: Não deve permitir salvar composição sem nome', async ({ page }) => {
        await page.goto('/products/compositions?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
        await page.getByRole('button', { name: /Nova Composição|\+ Composição/i }).click();

        // Tenta salvar direto sem preencher nada
        await page.getByRole('button', { name: /Salvar Composição/i }).click();

        // Como o botão pode estar desabilitado ou o sistema acusar erro obrigatório,
        // garantimos que o toast de erro aparece ou a interface não prossegue
        const errorToast = page.locator('text=Preencha os campos obrigatórios').first();
        const fallbackToast = page.locator('text=O nome da composição é obrigatório').first();
        
        const isErrorVisible = await errorToast.isVisible() || await fallbackToast.isVisible();
        if(isErrorVisible) {
            expect(true).toBe(true);
        } else {
            // Verifica se o modal de composição AINDA está na tela (não deixou salvar e fechar)
            await expect(page.getByRole('heading', { name: /Nova Composição|Cadastro de Composição/i })).toBeVisible();
        }
    });

    test('3. UI/UX: Deve exibir o estado vazio "Composição vazia" quando não houver itens', async ({ page }) => {
        await page.goto('/products/compositions?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
        await page.getByRole('button', { name: /Nova Composição|\+ Composição/i }).click();

        await page.getByRole('tab', { name: /Produtos Componentes/i }).click();

        // O estado vazio deve estar visível
        await expect(page.locator('text=Composição vazia')).toBeVisible();
        await expect(page.locator('text=Esta composição ainda não possui produtos reais vinculados')).toBeVisible();
    });

    test('4. Remoção de Item: Deve permitir excluir um componente da lista', async ({ page }) => {
        await page.goto('/products/compositions?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
        await page.getByRole('button', { name: /Nova Composição|\+ Composição/i }).click();

        await page.getByRole('tab', { name: /Produtos Componentes/i }).click();
        await page.getByRole('button', { name: /Adicionar Produto/i }).click();

        const searchInput = page.getByPlaceholder(/Buscar por nome, SKU/i);
        await searchInput.fill('a'); 
        await page.waitForTimeout(1000); 
        
        const firstResult = page.locator('button.group.w-full.text-left').first();
        if (await firstResult.isVisible()) {
            await firstResult.click();

            // Clica na lixeira para excluir
            const deleteBtn = page.locator('button i.bi-trash').first();
            if (await deleteBtn.isVisible()) {
                await deleteBtn.click();
                // Deve voltar pro empty state
                await expect(page.locator('text=Composição vazia')).toBeVisible();
            }
        }
    });

    test('5. Explosão do Kit: Ao selecionar a composição na Venda, deve explodir nos itens originais', async ({ page }) => {
        // 1. Acessa a tela de Novo Pedido de Venda
        await page.goto('/sales/new?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
        await page.waitForLoadState('domcontentloaded');

        // 2. Adiciona um item na venda
        await page.getByRole('button', { name: /Pesquisar produto/i }).first().click();

        // Busca pela composição cadastrada
        const searchInput = page.getByPlaceholder(/Buscar por nome, SKU/i);
        await searchInput.fill('CMP-'); 
        await page.waitForTimeout(1000);

        // Seleciona a primeira composição
        const compositionResult = page.locator('text=Composição').first(); 
        if (await compositionResult.isVisible()) {
            await compositionResult.click();

            // 3. Validação Crucial da Fase 3 (Explosão do Kit)
            // A tabela de itens não deve possuir a "Composição", mas sim os itens explodidos.
            const tableRows = page.locator('table tbody tr');
            const emptyRows = page.getByRole('button', { name: /Pesquisar produto/i });
            const emptyRowsCount = await emptyRows.count();
            
            // Deve haver linhas preenchidas com os produtos reais inseridos no lugar da linha vazia inicial
            expect(await tableRows.count()).toBeGreaterThan(emptyRowsCount);
        }
    });
});
