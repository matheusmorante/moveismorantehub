import { test, expect } from '@playwright/test';

test.describe('Suíte E2E B2B - Módulo de Etiquetas (Label Printing)', () => {
    const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
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

        // Mock das chamadas Supabase para busca de produtos
        await page.route('**/rest/v1/products*', async route => {
            if (route.request().method() === 'OPTIONS') {
                await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' }});
                return;
            }
            await route.fulfill({ 
                status: 200, 
                contentType: 'application/json',
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify([{
                    id: 'mock-prod-1',
                    name: 'Produto Teste Automacao [TESTE_AUT]',
                    reference_code: 'REF-TEST-001',
                    stock_quantity: 10,
                    cash_price: 150.00,
                    retail_price: 199.99,
                    images: []
                }]) 
            });
        });

        await page.route('**/rest/v1/product_variations*', async route => {
            if (route.request().method() === 'OPTIONS') {
                await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' }});
                return;
            }
            await route.fulfill({ 
                status: 200, 
                contentType: 'application/json',
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify([]) 
            });
        });

        await page.goto(`/estoque/etiquetas?${AUTH_QUERY}`);
        await page.waitForLoadState('domcontentloaded');
    });

    test.afterEach(async () => {
        const realErrors = consoleErrors.filter(e => 
            !e.includes('favicon') && 
            !e.includes('Download the React DevTools') &&
            !e.includes('net::ERR_CONNECTION_REFUSED') &&
            !e.includes('has been blocked by CORS policy')
        );
        expect(realErrors, 'Erros críticos de console detectados').toEqual([]);
        expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
    });

    test('Cenário 1: Acesso e Renderização Inicial (Aba Identificação)', async ({ page }) => {
        // Verifica o título da aba padrão
        await expect(page.locator('h1').filter({ hasText: 'Etiqueta de Identificação do Produto' })).toBeVisible({ timeout: 10000 });
        
        // Verifica se a fila (Queue) está vazia inicialmente
        await expect(page.locator('text=Nenhum produto adicionado à fila')).toBeVisible();
    });

    test('Cenário 2: Troca de Categorias de Etiqueta (Tabs)', async ({ page }) => {
        // Alterna para "Etiquetas de Preço"
        await page.click('button:has-text("Etiquetas de Preço")');
        await expect(page.locator('h1').filter({ hasText: 'Etiqueta de Preço' })).toBeVisible();
        
        // Verifica se os botões específicos do preço (como os 3 pontinhos) apareceram
        await expect(page.locator('button:has-text("⋮")')).toBeVisible();

        // Alterna para "Logotipos"
        await page.click('button:has-text("Logotipos")');
        await expect(page.locator('h1').filter({ hasText: 'Etiqueta de Logotipo' })).toBeVisible();

        // Volta para a aba inicial
        await page.click('button:has-text("Identificação")');
        await expect(page.locator('h1').filter({ hasText: 'Etiqueta de Identificação do Produto' })).toBeVisible();
    });

    test('Cenário 3 e 4: Interação com a Fila (Busca, Inserção e Remoção)', async ({ page }) => {
        // Foca no input de busca e procura por algo
        const searchInput = page.getByPlaceholder('Buscar produto por nome ou código...');
        await searchInput.fill('TESTE');

        // Espera o mock retornar
        const productCard = page.locator('text=Produto Teste Automacao [TESTE_AUT]').first();
        await expect(productCard).toBeVisible({ timeout: 10000 });

        // Clica no botão de "+" para adicionar à fila
        const addButton = page.locator('button').filter({ hasText: '+' }).first();
        await addButton.click();

        // Verifica se foi adicionado (a fila não deve mais mostrar "Nenhum produto")
        await expect(page.locator('text=Nenhum produto adicionado à fila')).toBeHidden();
        
        // Deve existir na lista da fila o nome do produto
        await expect(page.locator('.space-y-4').locator('text=Produto Teste Automacao [TESTE_AUT]').first()).toBeVisible();

        // Testar a remoção individual clicando na lixeira (trash)
        // Usando o ícone SVG de lixeira (normalmente um TrashIcon / heroicons que tem a classe stroke-current ou text-red-500)
        const removeBtn = page.locator('.space-y-4 button.text-red-500, .space-y-4 button.text-red-600').first();
        if (await removeBtn.isVisible()) {
            await removeBtn.click();
        } else {
            // Tenta clicar no primeiro botão svg vermelho
            await page.locator('.space-y-4 button:has(svg)').last().click();
        }

        // A fila deve voltar ao estado vazio
        await expect(page.locator('text=Nenhum produto adicionado à fila')).toBeVisible();
    });

    test('Cenário 5: Menu Suspenso e Modo Avançado (Etiquetas de Preço)', async ({ page }) => {
        // Muda para a aba de etiquetas de preço
        await page.click('button:has-text("Etiquetas de Preço")');
        
        // Clica nos 3 pontinhos para abrir o dropdown
        const menuBtn = page.locator('button:has-text("⋮")');
        await menuBtn.click();

        // Seleciona "Avançado" dentro do menu
        const advancedBtn = page.locator('button:has-text("Avançado")');
        await expect(advancedBtn).toBeVisible();
        await advancedBtn.click();

        // Reabre o menu para verificar opções
        await menuBtn.click();
        const templateBtn = page.locator('button').filter({ hasText: /TEMPLATE DA ETIQUETA/i });
        await expect(templateBtn).toBeVisible();
    });

    test('Cenário 6: Acionamento da Impressão', async ({ page }) => {
        // Busca um produto e adiciona à fila
        const searchInput = page.getByPlaceholder('Buscar produto por nome ou código...');
        await searchInput.fill('TESTE');
        const productCard = page.locator('text=Produto Teste Automacao [TESTE_AUT]').first();
        await expect(productCard).toBeVisible({ timeout: 10000 });

        const addButton = page.locator('button').filter({ hasText: '+' }).first();
        await addButton.click();

        // Intercepta a janela para não travar no window.print
        await page.addInitScript(() => {
            window.print = () => {
                console.log('Impressão simulada E2E');
            };
        });

        // Clica no botão de imprimir
        const printBtn = page.locator('button:has-text("IMPRIMIR ETIQUETAS")');
        await printBtn.click();

        // Como a implementação local abre uma tela modal ou printWindow overlay
        // Apenas confirmamos que clicar no botão não quebra a interface
        expect(pageErrors).toEqual([]);
    });
});
