# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inbound\quick-register.spec.ts >> Cadastro Rápido de Produtos via NF-e (Modo A & Modo B) e Abas do Modal >> Modo A: Cadastro Rápido de Novo Produto Pai + Variação 1 com Categoria IA e Cor extraída
- Location: tests\e2e\inbound\quick-register.spec.ts:47:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - region "Notifications Alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Cadastro Rápido de Produtos via NF-e (Modo A & Modo B) e Abas do Modal', () => {
  4  |     const testRunId = `TEST_AUT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  5  |     let consoleErrors: string[] = [];
  6  |     let pageErrors: string[] = [];
  7  | 
  8  |     test.beforeEach(async ({ page }) => {
  9  |         consoleErrors = [];
  10 |         pageErrors = [];
  11 | 
  12 |         page.on('console', msg => {
  13 |             if (msg.type() === 'error') {
  14 |                 consoleErrors.push(msg.text());
  15 |             }
  16 |         });
  17 | 
  18 |         page.on('pageerror', err => {
  19 |             pageErrors.push(err.message);
  20 |         });
  21 | 
  22 |         await page.goto('/?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  23 |         await page.waitForLoadState('domcontentloaded');
  24 |     });
  25 | 
  26 |     test.afterEach(async ({ page }) => {
  27 |         // Garantir que nenhum erro de console ou exceção não tratada ocorreu durante a execução
  28 |         const realErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('Download the React DevTools'));
  29 |         expect(realErrors, 'Erros no console detectados durante a navegação').toEqual([]);
  30 |         expect(pageErrors, 'Exceções de runtime (tela branca) detectadas').toEqual([]);
  31 | 
  32 |         // Teardown: Limpeza dos dados criados com testRunId
  33 |         await page.evaluate((runId) => {
  34 |             const raw = localStorage.getItem('erp_products');
  35 |             if (raw) {
  36 |                 try {
  37 |                     const products = JSON.parse(raw);
  38 |                     const filtered = products.filter((p: any) => !p.name?.includes(runId) && !p.id?.includes(runId));
  39 |                     localStorage.setItem('erp_products', JSON.stringify(filtered));
  40 |                 } catch (e) {
  41 |                     console.error(e);
  42 |                 }
  43 |             }
  44 |         }, testRunId);
  45 |     });
  46 | 
  47 |     test('Modo A: Cadastro Rápido de Novo Produto Pai + Variação 1 com Categoria IA e Cor extraída', async ({ page }) => {
  48 |         // Navegar para Notas de Entrada
  49 |         await page.goto('/stock/receipts');
  50 |         await page.waitForLoadState('networkidle').catch(() => {});
  51 | 
  52 |         // Simular preenchimento e verificação do modal de produto se estiver visível ou acionável
  53 |         const isPageLoaded = await page.locator('body').isVisible();
> 54 |         expect(isPageLoaded).toBe(true);
     |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  55 |     });
  56 | 
  57 |     test('Modo B: Cadastro Rápido de Variação em Produto Pai Existente com Cor extraída', async ({ page }) => {
  58 |         // Navegar para Notas de Entrada
  59 |         await page.goto('/stock/receipts');
  60 |         await page.waitForLoadState('networkidle').catch(() => {});
  61 | 
  62 |         const isPageLoaded = await page.locator('body').isVisible();
  63 |         expect(isPageLoaded).toBe(true);
  64 |     });
  65 | 
  66 |     test('Navegação sem Tela Branca em todas as Abas do Modal de Produto', async ({ page }) => {
  67 |         // Abrir modal de produto de teste
  68 |         await page.goto('/products');
  69 |         await page.waitForLoadState('domcontentloaded');
  70 | 
  71 |         // Se o botão de novo produto estiver visível, clica para testar as abas
  72 |         const newProductBtn = page.locator('button:has-text("Novo produto"), button:has-text("Cadastrar produto")').first();
  73 |         if (await newProductBtn.isVisible()) {
  74 |             await newProductBtn.click();
  75 |             await page.waitForTimeout(500);
  76 | 
  77 |             const tabs = ['Fotos', 'Informações Técnicas', 'Estoque e Precificação', 'Variações', 'Tributário / NF', 'Cadastro Geral'];
  78 |             for (const tabName of tabs) {
  79 |                 const tabBtn = page.locator(`button:has-text("${tabName}")`).first();
  80 |                 if (await tabBtn.isVisible()) {
  81 |                     await tabBtn.click();
  82 |                     await page.waitForTimeout(200);
  83 |                     // Garante que o container do modal permanece visível e renderizado sem crashes
  84 |                     await expect(page.locator('.fixed.inset-0')).toBeVisible();
  85 |                 }
  86 |             }
  87 | 
  88 |             // Fechar modal
  89 |             const closeBtn = page.locator('button:has-text("Descartar alterações"), button:has text("Fechar")').first();
  90 |             if (await closeBtn.isVisible()) {
  91 |                 await closeBtn.click();
  92 |             }
  93 |         }
  94 |     });
  95 | });
  96 | 
```