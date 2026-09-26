# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assistant\cases\quick-register.spec.ts >> Cadastro Rápido de Produtos via NF-e (Modo A & Modo B) e Abas do Modal >> Modo A: Cadastro Rápido de Novo Produto Pai + Variação 1 com Categoria IA e Cor extraída
- Location: tests\e2e\assistant\cases\quick-register.spec.ts:49:5

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
  3  | const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';
  4  | 
  5  | test.describe('Cadastro Rápido de Produtos via NF-e (Modo A & Modo B) e Abas do Modal', () => {
  6  |     const testRunId = `TEST_AUT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  7  |     let consoleErrors: string[] = [];
  8  |     let pageErrors: string[] = [];
  9  | 
  10 |     test.beforeEach(async ({ page }) => {
  11 |         consoleErrors = [];
  12 |         pageErrors = [];
  13 | 
  14 |         page.on('console', msg => {
  15 |             if (msg.type() === 'error') {
  16 |                 consoleErrors.push(msg.text());
  17 |             }
  18 |         });
  19 | 
  20 |         page.on('pageerror', err => {
  21 |             pageErrors.push(err.message);
  22 |         });
  23 | 
  24 |         await page.goto(`${BASE_URL}/?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator`);
  25 |         await page.waitForLoadState('domcontentloaded');
  26 |     });
  27 | 
  28 |     test.afterEach(async ({ page }) => {
  29 |         const realErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('Download the React DevTools'));
  30 |         expect(realErrors, 'Erros no console detectados durante a navegação').toEqual([]);
  31 |         expect(pageErrors, 'Exceções de runtime (tela branca) detectadas').toEqual([]);
  32 | 
  33 |         if (page.url() && !page.url().startsWith('about:blank')) {
  34 |             await page.evaluate((runId) => {
  35 |                 const raw = localStorage.getItem('erp_products');
  36 |                 if (raw) {
  37 |                     try {
  38 |                         const products = JSON.parse(raw);
  39 |                         const filtered = products.filter((p: any) => !p.name?.includes(runId) && !p.id?.includes(runId));
  40 |                         localStorage.setItem('erp_products', JSON.stringify(filtered));
  41 |                     } catch (e) {
  42 |                         console.error(e);
  43 |                     }
  44 |                 }
  45 |             }, testRunId).catch(() => {});
  46 |         }
  47 |     });
  48 | 
  49 |     test('Modo A: Cadastro Rápido de Novo Produto Pai + Variação 1 com Categoria IA e Cor extraída', async ({ page }) => {
  50 |         await page.goto(`${BASE_URL}/stock/receipts`);
  51 |         await page.waitForLoadState('networkidle').catch(() => {});
  52 |         const isPageLoaded = await page.locator('body').isVisible();
> 53 |         expect(isPageLoaded).toBe(true);
     |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  54 |     });
  55 | 
  56 |     test('Modo B: Cadastro Rápido de Variação em Produto Pai Existente com Cor extraída', async ({ page }) => {
  57 |         await page.goto(`${BASE_URL}/stock/receipts`);
  58 |         await page.waitForLoadState('networkidle').catch(() => {});
  59 |         const isPageLoaded = await page.locator('body').isVisible();
  60 |         expect(isPageLoaded).toBe(true);
  61 |     });
  62 | 
  63 |     test('Navegação sem Tela Branca em todas as Abas do Modal de Produto', async ({ page }) => {
  64 |         await page.goto(`${BASE_URL}/products`);
  65 |         await page.waitForLoadState('domcontentloaded');
  66 | 
  67 |         const newProductBtn = page.locator('button:has-text("Novo produto"), button:has-text("Cadastrar produto")').first();
  68 |         if (await newProductBtn.isVisible()) {
  69 |             await newProductBtn.click();
  70 |             await page.waitForTimeout(500);
  71 | 
  72 |             const tabs = ['Fotos', 'Informações Técnicas', 'Estoque e Precificação', 'Variações', 'Tributário / NF', 'Cadastro Geral'];
  73 |             for (const tabName of tabs) {
  74 |                 const tabBtn = page.locator(`button:has-text("${tabName}")`).first();
  75 |                 if (await tabBtn.isVisible()) {
  76 |                     await tabBtn.click();
  77 |                     await page.waitForTimeout(200);
  78 |                     await expect(page.locator('.fixed.inset-0')).toBeVisible();
  79 |                 }
  80 |             }
  81 | 
  82 |             const closeBtn = page.locator('button:has-text("Descartar alterações"), button:has-text("Fechar")').first();
  83 |             if (await closeBtn.isVisible()) {
  84 |                 await closeBtn.click();
  85 |             }
  86 |         }
  87 |     });
  88 | });
  89 | 
```