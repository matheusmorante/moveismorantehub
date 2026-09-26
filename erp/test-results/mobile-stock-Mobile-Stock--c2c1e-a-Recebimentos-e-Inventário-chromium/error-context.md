# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-stock.spec.ts >> Mobile Stock E2E >> NFs de Entrada, Recebimentos e Inventário
- Location: tests\e2e\mobile-stock.spec.ts:4:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Resumo')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Resumo') with timeout 15000ms
  - waiting for locator('text=Resumo')

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Mobile Stock E2E', () => {
  4  |   test('NFs de Entrada, Recebimentos e Inventário', async ({ page }) => {
  5  |     // 1. Acessa o app mobile na aba estoque com auth mockada
  6  |     await page.goto('http://localhost:8081/?auth_email=matheusmorante002@gmail.com&tab=estoque');
  7  | 
  8  |     // Espera o carregamento inicial (verifica se a aba Estoque está ativa/visível)
> 9  |     await expect(page.locator('text=Resumo')).toBeVisible({ timeout: 15000 });
     |                                               ^ Error: expect(locator).toBeVisible() failed
  10 | 
  11 |     // 2. Testar NFs de Entrada
  12 |     await page.click('text=NF Entrada');
  13 |     await page.waitForTimeout(2000); // Aguarda hook rodar
  14 | 
  15 |     // Verifica se não há mensagens de erro de compilação ou loop infinito.
  16 |     // Se o app não quebrou, o tab deve continuar responsivo
  17 |     await expect(page.locator('text=NF Entrada').first()).toBeVisible();
  18 | 
  19 |     // 3. Testar Recebimentos
  20 |     await page.click('text=Recebimentos');
  21 |     await page.waitForTimeout(2000);
  22 |     // Verificar se renderizou a aba
  23 |     await expect(page.locator('text=Recebimentos').first()).toBeVisible({ timeout: 10000 });
  24 | 
  25 | 
  26 |     // 3.5 Testar Fornecedores
  27 |     await page.click('text=Fornecedores');
  28 |     await page.waitForTimeout(2000);
  29 |     await expect(page.locator('text=Fornecedores').first()).toBeVisible();
  30 | 
  31 |     // 3.8 Testar Pedidos de Compra
  32 |     await page.click('text=Pedidos');
  33 |     await page.waitForTimeout(2000);
  34 |     await expect(page.locator('text=Novo Pedido').first()).toBeVisible({ timeout: 10000 });
  35 | 
  36 | 
  37 | 
  38 | 
  39 |     // 4. Testar Inventário
  40 |     await page.click('text=Inventário');
  41 |     await page.waitForTimeout(1000);
  42 |     await expect(page.locator('text=Inventário').first()).toBeVisible();
  43 |     
  44 |     // Clicar em "Iniciar Contagem"
  45 |     await page.click('text=Iniciar Contagem');
  46 | 
  47 |     // Esperar a nova tela de contagem aparecer e renderizar corretamente
  48 |     await expect(page.locator('text=1. ADICIONAR POR FORNECEDOR')).toBeVisible({ timeout: 10000 });
  49 |     await expect(page.locator('text=2. ADICIONAR PRODUTO INDIVIDUAL')).toBeVisible();
  50 |     await expect(page.locator('text=Nenhum produto adicionado à lista de inventário.')).toBeVisible();
  51 | 
  52 |     const searchInput = page.getByPlaceholder('Buscar por nome, SKU...');
  53 |     await searchInput.fill('Sofá');
  54 |     
  55 |     await expect(searchInput).toBeVisible();
  56 |   });
  57 | });
  58 | 
```