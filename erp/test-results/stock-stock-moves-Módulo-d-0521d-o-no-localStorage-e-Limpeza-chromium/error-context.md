# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock\stock-moves.spec.ts >> Módulo de Estoque - Movimentações, Histórico e Inventário >> 3. Persistência de Filtro de Produto no localStorage e Limpeza
- Location: tests\e2e\stock\stock-moves.spec.ts:99:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5174/stock?tab=history&auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator
Call log:
  - navigating to "http://127.0.0.1:5174/stock?tab=history&auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator", waiting until "domcontentloaded"

```

# Test source

```ts
  1   | /**
  2   |  * Suíte E2E Playwright — Movimentações de Estoque, Histórico e Auditoria
  3   |  * Morante Hub ERP
  4   |  *
  5   |  * Cobertura:
  6   |  * 1. Renderização da página /stock com aba ativa "history"
  7   |  * 2. Filtro de produtos e variações no ProductAutocomplete com persistência local
  8   |  * 3. Alternância entre abas de Movimentações e Inventários sem regressão de interface
  9   |  * 4. Abertura e fechamento do modal de contagem de inventário (InventoryAuditModal)
  10  |  * 5. Teardown Seguro com testRunId
  11  |  */
  12  | 
  13  | import { test, expect } from '@playwright/test';
  14  | 
  15  | const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  16  | 
  17  | test.describe('Módulo de Estoque - Movimentações, Histórico e Inventário', () => {
  18  |     const testRunId = `TEST_AUT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  19  |     let consoleErrors: string[] = [];
  20  |     let pageErrors: string[] = [];
  21  | 
  22  |     test.beforeEach(async ({ page }) => {
  23  |         consoleErrors = [];
  24  |         pageErrors = [];
  25  | 
  26  |         page.on('console', (msg) => {
  27  |             if (msg.type() === 'error') {
  28  |                 consoleErrors.push(msg.text());
  29  |             }
  30  |         });
  31  | 
  32  |         page.on('pageerror', (err) => {
  33  |             pageErrors.push(err.message);
  34  |         });
  35  |     });
  36  | 
  37  |     test.afterEach(async ({ page }) => {
  38  |         const criticalConsoleErrors = consoleErrors.filter(
  39  |             (msg) =>
  40  |                 !msg.includes('favicon') &&
  41  |                 !msg.includes('React DevTools') &&
  42  |                 !msg.includes('net::ERR_FAILED') &&
  43  |                 !msg.includes('Failed to load resource')
  44  |         );
  45  | 
  46  |         expect(criticalConsoleErrors, 'Erros críticos de console detectados').toEqual([]);
  47  |         expect(pageErrors, 'Exceções não tratadas (tela branca) detectadas').toEqual([]);
  48  | 
  49  |         // Teardown: remover filtros persistidos em localStorage
  50  |         await page.evaluate(() => {
  51  |             try {
  52  |                 localStorage.removeItem('morante_stock_selected_product_filter');
  53  |             } catch (e) {
  54  |                 console.error('Erro no teardown:', e);
  55  |             }
  56  |         });
  57  |     });
  58  | 
  59  |     test('1. Renderização de /stock na aba Histórico com cabeçalho de Movimentações', async ({ page }) => {
  60  |         await page.goto(`/stock?tab=history&${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  61  |         await page.waitForLoadState('networkidle').catch(() => {});
  62  | 
  63  |         // Validar título no cabeçalho
  64  |         const title = page.locator('h1:has-text("Movimentações")');
  65  |         await expect(title).toBeVisible({ timeout: 15000 });
  66  | 
  67  |         // Validar que o campo de busca/filtro de produto está presente
  68  |         const productSearch = page.locator('input[placeholder*="Buscar produto"], input[placeholder*="produto"]').first();
  69  |         await expect(productSearch).toBeVisible();
  70  |     });
  71  | 
  72  |     test('2. Alternância de abas para Inventários (/stock?tab=audit) e exibição do botão Novo inventário', async ({ page }) => {
  73  |         await page.goto(`/stock?tab=audit&${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  74  |         await page.waitForLoadState('networkidle').catch(() => {});
  75  | 
  76  |         // Validar título de inventários
  77  |         const auditTitle = page.locator('h1:has-text("Inventários")');
  78  |         await expect(auditTitle).toBeVisible({ timeout: 15000 });
  79  | 
  80  |         // Validar presença do botão "Novo inventário"
  81  |         const startAuditBtn = page.locator('button:has-text("Novo inventário")');
  82  |         await expect(startAuditBtn).toBeVisible();
  83  | 
  84  |         // Clicar em "Novo inventário" e validar abertura do modal
  85  |         await startAuditBtn.click();
  86  |         await page.waitForTimeout(400);
  87  | 
  88  |         // Modal deve estar visível
  89  |         const modal = page.locator('div[role="dialog"], .fixed.inset-0').first();
  90  |         await expect(modal).toBeVisible();
  91  | 
  92  |         // Fechar modal via botão de fechar (x) no header do ScopeModal
  93  |         const closeBtn = page.locator('button i.bi-x-lg').first();
  94  |         if (await closeBtn.isVisible()) {
  95  |             await closeBtn.click();
  96  |         }
  97  |     });
  98  | 
  99  |     test('3. Persistência de Filtro de Produto no localStorage e Limpeza', async ({ page }) => {
> 100 |         await page.goto(`/stock?tab=history&${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
      |                    ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5174/stock?tab=history&auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator
  101 |         await page.waitForLoadState('networkidle').catch(() => {});
  102 | 
  103 |         const searchInput = page.locator('input[placeholder*="Buscar produto"], input[placeholder*="produto"]').first();
  104 |         if (await searchInput.isVisible()) {
  105 |             await searchInput.fill('Cadeira');
  106 |             await page.waitForTimeout(600);
  107 | 
  108 |             // Se houver dropdown de sugestões de produtos, clicar no primeiro
  109 |             const suggestion = page.locator('.suggestion-item, [role="option"], li button').first();
  110 |             if (await suggestion.isVisible()) {
  111 |                 await suggestion.click();
  112 |                 await page.waitForTimeout(400);
  113 | 
  114 |                 // Validar que a chave foi persistida no localStorage
  115 |                 const savedFilter = await page.evaluate(() => {
  116 |                     return localStorage.getItem('morante_stock_selected_product_filter');
  117 |                 });
  118 |                 expect(savedFilter).toBeTruthy();
  119 | 
  120 |                 // Clicar no botão de limpar filtro se existir
  121 |                 const clearBtn = page.locator('button[title*="Limpar"], button:has-text("Limpar")').first();
  122 |                 if (await clearBtn.isVisible()) {
  123 |                     await clearBtn.click();
  124 |                     await page.waitForTimeout(300);
  125 | 
  126 |                     const clearedFilter = await page.evaluate(() => {
  127 |                         return localStorage.getItem('morante_stock_selected_product_filter');
  128 |                     });
  129 |                     expect(clearedFilter).toBeNull();
  130 |                 }
  131 |             }
  132 |         }
  133 |     });
  134 | });
  135 | 
```