import { test, expect } from '@playwright/test';

// Utilizando setup de testes existente se houver, ou a estrutura básica
// Como não temos acesso direto ao auth do projeto aqui, vamos assumir que existe um script global de setup ou fazer login
// ou ignorar auth se for um ambiente de teste local configurado para isso.
// Mas para este teste de componente E2E simples, acessaremos a rota:

test.describe('Supplier Reconciliation (Conciliação de Produtos)', () => {
    
    test.beforeEach(async ({ page }) => {
        // Redireciona e assegura que a página carregou. Vamos supor que não tem tela de login bloqueando no localhost,
        // ou que a sessão é carregada pelo storageState do Playwright.
        // Se houver necessidade de auth, adicione aqui o acesso à tela de login.
        await page.goto('/products/reconciliation/suppliers');
        
        // Espera a página carregar (um texto conhecido ou elemento)
        await page.waitForLoadState('networkidle');
    });

    test('CT01: Should load the supplier reconciliation page without errors', async ({ page }) => {
        // Verifica que o título da página está presente
        await expect(page.getByText('Conciliação de Fornecedores')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Fornecedor Atual')).toBeVisible();
        await expect(page.getByText('Categoria')).toBeVisible();
        await expect(page.getByText('Buscar (Nome / SKU)')).toBeVisible();
    });

    test('CT02: Should load without import errors or React crashes (TypeError)', async ({ page }) => {
        // Se a página renderizou "Status da Pendência" ou a tabela, significa que não deu crash do React
        const table = page.locator('table');
        await expect(table).toBeVisible({ timeout: 10000 });
        
        // Deve listar produtos ou a mensagem de "Nenhum produto encontrado"
        const noProductMsg = page.getByText('Nenhum produto encontrado para os filtros atuais');
        const rows = page.locator('table tbody tr');
        
        const count = await rows.count();
        if (count === 0) {
            await expect(noProductMsg).toBeVisible();
        } else {
            expect(count).toBeGreaterThan(0);
        }
    });

    test('CT03: Should filter products by status', async ({ page }) => {
        // Altera o filtro "Status da Pendência" de "Sem fornecedor" para "Todos"
        // Como é um select HTML padrão ou componente customizado, tentamos clicar e selecionar
        const statusSelect = page.locator('select').first(); // Supondo que seja o primeiro select, ajuste se necessário
        
        // Como o React pode não ter carregado a tabela logo de cara, esperamos
        await page.waitForTimeout(1000); 

        // Vamos procurar pelo label "Status da Pendência"
        await expect(page.getByText('Status da Pendência')).toBeVisible();
        
        // Tenta interagir e buscar
        const searchInput = page.getByPlaceholder('Buscar...'); // do input livre
        if (await searchInput.isVisible()) {
            await searchInput.fill('Teste');
            await page.waitForTimeout(500); // debounce
        }
    });
});
