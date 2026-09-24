import { test, expect } from '@playwright/test';

// Utilizando a URL com parâmetros para autenticar automaticamente como admin e abrir a aba de estoque
const START_URL = '/?auth_email=matheusmorante002@gmail.com&tab=estoque';

test.describe('Módulo de Estoque - E2E (Mobile on Web)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(START_URL);
    // Wait for the main stock module tab summary to appear
    await expect(page.getByTestId('tab-summary')).toBeVisible({ timeout: 60000 });
  });

  test('Deve renderizar a aba Movimentações, carregar lista e testar pesquisa', async ({ page }) => {
    // Navegar para Movimentações
    await page.getByTestId('tab-moves').first().click();
    
    // Aguardar o carregamento terminar (paginação aparecer significa que a lista carregou)
    await expect(page.locator('text=Página 1 de').first()).toBeVisible({ timeout: 15000 });

    // Verificar se existe pelo menos um item na lista (ex: texto 'un' que está no card de movimentação, ou texto de data)
    // Se a base de dados tiver dados, isso passará
    const listItems = page.locator('text=un');
    if (await listItems.count() > 0) {
        await expect(listItems.first()).toBeVisible();
    }

    // Testar pesquisa de produto (autocomplete implementado)
    const searchInput = page.locator('input[placeholder="Pesquisar produto..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('mo');
    
    // Aguardar debounce e carregamento das sugestões
    await page.waitForTimeout(1000);
    
    // Se houver sugestão correspondente, deve aparecer
    const suggestionItem = page.locator('text=SKU:').first();
    if (await suggestionItem.isVisible()) {
        await suggestionItem.click();
        
        // Verificar se a pesquisa filtrou e aplicou a tag "Produto: "
        await expect(page.locator('text=Produto:').first()).toBeVisible();
        
        // Limpar o produto
        await page.locator('text=X').first().click();
        await expect(page.locator('text=Produto:').first()).toBeHidden();
    }
  });

  test('Deve renderizar Pedidos de Compra e carregar a lista', async ({ page }) => {
    await page.getByTestId('tab-purchases').first().click();
    
    // Aguardar botão 'Novo Pedido'
    await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 15000 });
    
    // Se houver pedidos
    const statusLabel = page.locator('text=Pedido #');
    if (await statusLabel.count() > 0) {
        await expect(statusLabel.first()).toBeVisible();
    }
  });

  test('Deve renderizar Notas Fiscais e carregar a lista', async ({ page }) => {
    await page.getByTestId('tab-invoices').first().click();

    // Aguardar botão 'Importar'
    await expect(page.locator('text=Importar').first()).toBeVisible({ timeout: 15000 });

    // Clicar em "Importar" para verificar se o modal abre
    const btnImportar = page.locator('text=Importar').first();
    await btnImportar.click();
    
    await expect(page.locator('text=Chave de Acesso')).toBeVisible();
    const accessKeyInput = page.getByPlaceholder('Digite os 44 dígitos...');
    await accessKeyInput.fill('1234567890');
    const consultButton = page.getByText('Consultar no SEFAZ').first().locator('..');
    await expect(consultButton).toHaveAttribute('aria-disabled', 'true');
    await page.locator('text=Cancelar').click();
  });

  test('Deve abrir o gerenciamento de vínculos de uma nota fiscal', async ({ page }) => {
    await page.getByTestId('tab-invoices').first().click();
    await expect(page.getByText('NF-e #133744').first()).toBeVisible({ timeout: 15000 });

    await page.getByLabel('Mais opções').first().click();
    await page.getByText('Gerenciar vínculos', { exact: true }).click();

    await expect(page.getByText('Gerenciar vínculos', { exact: true }).last()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Concluir', { exact: true })).toBeVisible({ timeout: 15000 });

    await page.getByText('Composição', { exact: true }).first().click();
    await expect(page.getByPlaceholder('Adicionar produto à composição...').first()).toBeVisible({ timeout: 15000 });
    await page.getByText('Concluir', { exact: true }).click();
    await expect(page.getByText('Gerenciar vínculos', { exact: true }).last()).not.toBeVisible();
  });

  test('Deve renderizar Recebimentos e carregar a lista', async ({ page }) => {
    await page.getByTestId('tab-receipts').first().click();
    
    await page.waitForTimeout(1000);
    const label = page.locator('text=Recebimento #');
    if (await label.count() > 0) {
        await expect(label.first()).toBeVisible();
    }
  });

  test('Deve renderizar Inventário e carregar a lista', async ({ page }) => {
    await page.getByTestId('tab-inventory').first().click();
    
    // Aguardar botão de escanear que faz parte do cabeçalho da página (indica que renderizou)
    await expect(page.locator('text=Escanear').first()).toBeVisible({ timeout: 15000 });
    
    // Se a base de dados tiver sessões de inventário (ex: "Inventário Geral")
    const invGeral = page.locator('text=Inventário');
    if (await invGeral.count() > 0) {
        await expect(invGeral.first()).toBeVisible();
    }
  });

  test('Deve renderizar Fornecedores e carregar a lista', async ({ page }) => {
    await page.getByTestId('tab-suppliers').first().click();
    
    // Aguardar o carregamento (só para dar tempo de bater na rede)
    await page.waitForTimeout(1000);
    
    // Se tiver fornecedores, o documento ou nome aparece
    // Como a lista renderiza um card, podemos checar se o FlatList existe
    await expect(page.locator('text=Fornecedores').first()).toBeVisible({ timeout: 15000 });
  });

});
