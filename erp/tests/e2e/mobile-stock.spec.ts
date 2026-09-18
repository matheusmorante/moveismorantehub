import { test, expect } from '@playwright/test';

test.describe('Mobile Stock E2E', () => {
  test('NFs de Entrada, Recebimentos e Inventário', async ({ page }) => {
    // 1. Acessa o app mobile na aba estoque com auth mockada
    await page.goto('http://localhost:8081/?auth_email=matheusmorante002@gmail.com&tab=estoque');

    // Espera o carregamento inicial (verifica se a aba Estoque está ativa/visível)
    await expect(page.locator('text=Resumo')).toBeVisible({ timeout: 15000 });

    // 2. Testar NFs de Entrada
    await page.click('text=NF Entrada');
    await page.waitForTimeout(2000); // Aguarda hook rodar

    // Verifica se não há mensagens de erro de compilação ou loop infinito.
    // Se o app não quebrou, o tab deve continuar responsivo
    await expect(page.locator('text=NF Entrada').first()).toBeVisible();

    // 3. Testar Recebimentos
    await page.click('text=Recebimentos');
    await page.waitForTimeout(2000);
    // Verificar se renderizou a aba
    await expect(page.locator('text=Recebimentos').first()).toBeVisible({ timeout: 10000 });


    // 3.5 Testar Fornecedores
    await page.click('text=Fornecedores');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Fornecedores').first()).toBeVisible();

    // 3.8 Testar Pedidos de Compra
    await page.click('text=Pedidos');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 10000 });




    // 4. Testar Inventário
    await page.click('text=Inventário');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Inventário').first()).toBeVisible();
    
    // Clicar em "Iniciar Contagem"
    await page.click('text=Iniciar Contagem');

    // Esperar a nova tela de contagem aparecer e renderizar corretamente
    await expect(page.locator('text=1. ADICIONAR POR FORNECEDOR')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=2. ADICIONAR PRODUTO INDIVIDUAL')).toBeVisible();
    await expect(page.locator('text=Nenhum produto adicionado à lista de inventário.')).toBeVisible();

    const searchInput = page.getByPlaceholder('Buscar por nome, SKU...');
    await searchInput.fill('Sofá');
    
    await expect(searchInput).toBeVisible();
  });
});
