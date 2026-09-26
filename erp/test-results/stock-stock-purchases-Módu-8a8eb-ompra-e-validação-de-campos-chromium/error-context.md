# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock\stock-purchases.spec.ts >> Módulo de Estoque - Pedidos de Compra >> 2. Abertura do modal de criação de compra e validação de campos
- Location: tests\e2e\stock\stock-purchases.spec.ts:61:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Nova Compra")')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:react-babel] C:\\Users\\Rosilene\\Desktop\\morantehub\\erp\\src\\pages\\App\\SalesOrder\\OrderHistoryList\\OrderHistoryRow.tsx: Unexpected token (157:12) 160 | <div className=\"flex flex-col py-1\">"
  - generic [ref=e5]: C:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryRow.tsx:157:12
  - generic [ref=e6]: "158| return ( 159| <td key={key} className={`${baseTdClass} relative`}> 160| <div className=\"flex flex-col py-1\"> | ^ 161| <span 162| className=\"text-[13px] font-black text-slate-700 dark:text-slate-200 tracking-tight leading-tight mb-1 truncate\""
  - generic [ref=e7]: at constructor (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:365:19) at TypeScriptParserMixin.raise (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:6616:19) at TypeScriptParserMixin.unexpected (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:6636:16) at TypeScriptParserMixin.parseExprAtom (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:11459:22) at TypeScriptParserMixin.parseExprAtom (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:4776:20) at TypeScriptParserMixin.parseExprSubscripts (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:11098:23) at TypeScriptParserMixin.parseUpdate (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:11083:21) at TypeScriptParserMixin.parseMaybeUnary (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:11063:23) at TypeScriptParserMixin.parseMaybeUnary (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:9854:18) at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10916:61) at TypeScriptParserMixin.parseExprOps (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10921:23) at TypeScriptParserMixin.parseMaybeConditional (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10898:23) at TypeScriptParserMixin.parseMaybeAssign (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10848:21) at TypeScriptParserMixin.parseMaybeAssign (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:9803:20) at TypeScriptParserMixin.parseExpressionBase (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10801:23) at C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10797:39 at TypeScriptParserMixin.allowInAnd (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12438:16) at TypeScriptParserMixin.parseExpression (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10797:17) at TypeScriptParserMixin.parseStatementContent (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12912:23) at TypeScriptParserMixin.parseStatementContent (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:9525:18) at TypeScriptParserMixin.parseStatementLike (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12784:17) at TypeScriptParserMixin.parseStatementListItem (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12764:17) at TypeScriptParserMixin.parseBlockOrModuleBlockBody (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:13333:61) at TypeScriptParserMixin.parseBlockBody (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:13326:10) at TypeScriptParserMixin.parseBlock (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:13314:10) at TypeScriptParserMixin.parseStatementContent (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12875:21) at TypeScriptParserMixin.parseStatementContent (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:9525:18) at TypeScriptParserMixin.parseStatementLike (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12784:17) at TypeScriptParserMixin.parseStatementListItem (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12764:17) at TypeScriptParserMixin.parseSwitchStatement (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:13191:36) at TypeScriptParserMixin.parseStatementContent (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12817:21) at TypeScriptParserMixin.parseStatementContent (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:9525:18) at TypeScriptParserMixin.parseStatementLike (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12784:17) at TypeScriptParserMixin.parseStatementListItem (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12764:17) at TypeScriptParserMixin.parseBlockOrModuleBlockBody (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:13333:61) at TypeScriptParserMixin.parseBlockBody (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:13326:10) at TypeScriptParserMixin.parseBlock (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:13314:10) at TypeScriptParserMixin.parseFunctionBody (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12117:24) at TypeScriptParserMixin.parseArrowExpression (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:12092:10) at TypeScriptParserMixin.parseParenAndDistinguishExpression (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:11704:12) at TypeScriptParserMixin.parseExprAtom (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:11348:23) at TypeScriptParserMixin.parseExprAtom (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:4776:20) at TypeScriptParserMixin.parseExprSubscripts (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:11098:23) at TypeScriptParserMixin.parseUpdate (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:11083:21) at TypeScriptParserMixin.parseMaybeUnary (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:11063:23) at TypeScriptParserMixin.parseMaybeUnary (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:9854:18) at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10916:61) at TypeScriptParserMixin.parseExprOps (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10921:23) at TypeScriptParserMixin.parseMaybeConditional (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10898:23) at TypeScriptParserMixin.parseMaybeAssign (C:\Users\Rosilene\Desktop\morantehub\erp\node_modules\@babel\parser\lib\index.js:10848:21
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.ts
    - text: .
```

# Test source

```ts
  1  | /**
  2  |  * Suíte E2E Playwright — Pedidos de Compra e Gestão de Fornecedores
  3  |  * Morante Hub ERP
  4  |  *
  5  |  * Cobertura:
  6  |  * 1. Renderização de /stock/purchases com redirecionamento canônico e cabeçalho operacional
  7  |  * 2. Abertura do modal de Novo Pedido de Compra (PurchaseFormModal)
  8  |  * 3. Validação dos campos obrigatórios (Fornecedor, Data, Itens, IPI, Frete)
  9  |  * 4. Fechamento seguro do modal e integridade de navegação
  10 |  */
  11 | 
  12 | import { test, expect } from '@playwright/test';
  13 | 
  14 | const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  15 | 
  16 | test.describe('Módulo de Estoque - Pedidos de Compra', () => {
  17 |     let consoleErrors: string[] = [];
  18 |     let pageErrors: string[] = [];
  19 | 
  20 |     test.beforeEach(async ({ page }) => {
  21 |         consoleErrors = [];
  22 |         pageErrors = [];
  23 | 
  24 |         page.on('console', (msg) => {
  25 |             if (msg.type() === 'error') {
  26 |                 consoleErrors.push(msg.text());
  27 |             }
  28 |         });
  29 | 
  30 |         page.on('pageerror', (err) => {
  31 |             pageErrors.push(err.message);
  32 |         });
  33 |     });
  34 | 
  35 |     test.afterEach(async ({ page }) => {
  36 |         const criticalConsoleErrors = consoleErrors.filter(
  37 |             (msg) =>
  38 |                 !msg.includes('favicon') &&
  39 |                 !msg.includes('React DevTools') &&
  40 |                 !msg.includes('net::ERR_FAILED') &&
  41 |                 !msg.includes('Failed to load resource')
  42 |         );
  43 | 
  44 |         expect(criticalConsoleErrors, 'Erros críticos de console detectados').toEqual([]);
  45 |         expect(pageErrors, 'Exceções não tratadas (tela branca) detectadas').toEqual([]);
  46 |     });
  47 | 
  48 |     test('1. Renderização da tela de Pedidos de Compra com cabeçalho e botão Nova Compra', async ({ page }) => {
  49 |         await page.goto(`/stock/purchases?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  50 |         await page.waitForLoadState('networkidle').catch(() => {});
  51 | 
  52 |         // Validar título
  53 |         const title = page.locator('h1:has-text("Pedidos de Compra")');
  54 |         await expect(title).toBeVisible({ timeout: 15000 });
  55 | 
  56 |         // Validar botão de Nova Compra
  57 |         const newPurchaseBtn = page.locator('button:has-text("Nova Compra")');
  58 |         await expect(newPurchaseBtn).toBeVisible();
  59 |     });
  60 | 
  61 |     test('2. Abertura do modal de criação de compra e validação de campos', async ({ page }) => {
  62 |         await page.goto(`/stock/purchases?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  63 |         await page.waitForLoadState('networkidle').catch(() => {});
  64 | 
  65 |         // Abrir modal de Nova Compra
  66 |         const newPurchaseBtn = page.locator('button:has-text("Nova Compra")');
> 67 |         await newPurchaseBtn.click();
     |                              ^ Error: locator.click: Test timeout of 30000ms exceeded.
  68 | 
  69 |         // Validar título do modal
  70 |         const modalTitle = page.locator('h2:has-text("Novo Pedido de Compra")');
  71 |         await expect(modalTitle).toBeVisible({ timeout: 8000 });
  72 | 
  73 |         // Validar campo de busca de fornecedor
  74 |         const supplierInput = page.locator('input[placeholder*="Buscar fornecedor"]').first();
  75 |         await expect(supplierInput).toBeVisible();
  76 | 
  77 |         // Fechar modal
  78 |         const closeBtn = page.locator('button[aria-label="Fechar modal"]').first();
  79 |         await expect(closeBtn).toBeVisible();
  80 |         await closeBtn.click();
  81 | 
  82 |         await page.waitForTimeout(400);
  83 |         await expect(modalTitle).not.toBeVisible();
  84 |     });
  85 | });
  86 | 
```