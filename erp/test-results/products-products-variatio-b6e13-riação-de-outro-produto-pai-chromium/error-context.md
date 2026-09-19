# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 7: Fusão de variação com variação de outro produto pai
- Location: tests\e2e\products\products-variations-e2e.spec.ts:177:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text("Novo Produto")').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('button:has-text("Novo Produto")').first() with timeout 15000ms
  - waiting for locator('button:has-text("Novo Produto")').first()

```

```yaml
- text: "[plugin:vite:react-babel] C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\src\\pages\\App\\Products\\components\\VariationRow.tsx: Unexpected token, expected \",\" (47:18) 50 | <div className=\"flex xl:table-cell xl:px-6 xl:py-4 items-center gap-3\"> C:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/erp/src/pages/App/Products/components/VariationRow.tsx:47:18 46 | re <div 47 | key={v.id} 48 | className=\"flex flex-col gap-3 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 xl:table-row xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group relative\" | ^ 49 | > 50 | <div className=\"flex xl:table-cell xl:px-6 xl:py-4 items-center gap-3\"> at constructor (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:365:19) at TypeScriptParserMixin.raise (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:6616:19) at TypeScriptParserMixin.unexpected (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:6636:16) at TypeScriptParserMixin.expect (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:6916:12) at TypeScriptParserMixin.parseObjectLike (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11839:14) at TypeScriptParserMixin.parseExprAtom (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11356:23) at TypeScriptParserMixin.parseExprAtom (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:4776:20) at TypeScriptParserMixin.parseExprSubscripts (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11098:23) at TypeScriptParserMixin.parseUpdate (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11083:21) at TypeScriptParserMixin.parseMaybeUnary (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11063:23) at TypeScriptParserMixin.parseMaybeUnary (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:9854:18) at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10916:61) at TypeScriptParserMixin.parseExprOps (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10921:23) at TypeScriptParserMixin.parseMaybeConditional (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10898:23) at TypeScriptParserMixin.parseMaybeAssign (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10848:21) at TypeScriptParserMixin.parseMaybeAssign (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:9803:20) at TypeScriptParserMixin.parseMaybeAssign (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10877:25) at TypeScriptParserMixin.parseMaybeAssign (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:9803:20) at TypeScriptParserMixin.parseExpressionBase (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10801:23) at C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10797:39 at TypeScriptParserMixin.allowInAnd (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:12438:16) at TypeScriptParserMixin.parseExpression (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10797:17) at TypeScriptParserMixin.parseStatementContent (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:12912:23) at TypeScriptParserMixin.parseStatementContent (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:9525:18) at TypeScriptParserMixin.parseStatementLike (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:12784:17) at TypeScriptParserMixin.parseStatementListItem (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:12764:17) at TypeScriptParserMixin.parseBlockOrModuleBlockBody (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:13333:61) at TypeScriptParserMixin.parseBlockBody (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:13326:10) at TypeScriptParserMixin.parseBlock (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:13314:10) at TypeScriptParserMixin.parseFunctionBody (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:12117:24) at TypeScriptParserMixin.parseArrowExpression (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:12092:10) at TypeScriptParserMixin.parseParenAndDistinguishExpression (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11704:12) at TypeScriptParserMixin.parseExprAtom (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11348:23) at TypeScriptParserMixin.parseExprAtom (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:4776:20) at TypeScriptParserMixin.parseExprSubscripts (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11098:23) at TypeScriptParserMixin.parseUpdate (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11083:21) at TypeScriptParserMixin.parseMaybeUnary (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11063:23) at TypeScriptParserMixin.parseMaybeUnary (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:9854:18) at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10916:61) at TypeScriptParserMixin.parseExprOps (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10921:23) at TypeScriptParserMixin.parseMaybeConditional (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10898:23) at TypeScriptParserMixin.parseMaybeAssign (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10848:21) at TypeScriptParserMixin.parseMaybeAssign (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:9803:20) at C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10817:39 at TypeScriptParserMixin.allowInAnd (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:12443:12) at TypeScriptParserMixin.parseMaybeAssignAllowIn (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:10817:17) at TypeScriptParserMixin.parseMaybeAssignAllowInOrVoidPattern (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:12510:17) at TypeScriptParserMixin.parseExprListItem (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:12192:18) at TypeScriptParserMixin.parseCallExpressionArguments (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11269:22) at TypeScriptParserMixin.parseCoverCallAndAsyncArrowHead (C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\erp\\node_modules\\@babel\\parser\\lib\\index.js:11203:29 Click outside, press Esc key, or fix the code to dismiss. You can also disable this overlay by setting"
- code: server.hmr.overlay
- text: to
- code: "false"
- text: in
- code: vite.config.ts
- text: .
```

```
Error: Erros críticos de console detectados

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
+   "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
+ ]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio', () => {
  4   |     const testRunId = `[TESTE_AUT]_VAR_${Date.now()}`;
  5   |     const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  6   |     let consoleErrors: string[] = [];
  7   |     let pageErrors: string[] = [];
  8   | 
  9   |     test.beforeEach(async ({ page }) => {
  10  |         consoleErrors = [];
  11  |         pageErrors = [];
  12  | 
  13  |         page.on('console', msg => {
  14  |             if (msg.type() === 'error') {
  15  |                 consoleErrors.push(msg.text());
  16  |             }
  17  |         });
  18  | 
  19  |         page.on('pageerror', err => {
  20  |             pageErrors.push(err.message);
  21  |         });
  22  | 
  23  |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  24  |         await page.waitForLoadState('domcontentloaded');
  25  |     });
  26  | 
  27  |     test.afterEach(async ({ page }) => {
  28  |         const realErrors = consoleErrors.filter(e => 
  29  |             !e.includes('favicon') && 
  30  |             !e.includes('Download the React DevTools') &&
  31  |             !e.includes('net::ERR_CONNECTION_REFUSED') && !e.includes('404') && !e.includes('Not Found')
  32  |         );
> 33  |         expect(realErrors, 'Erros críticos de console detectados').toEqual([]);
      |                                                                    ^ Error: Erros críticos de console detectados
  34  |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  35  | 
  36  |         // Teardown seguro de dados criados com testRunId
  37  |         await page.evaluate((runId) => {
  38  |             const raw = localStorage.getItem('erp_products');
  39  |             if (raw) {
  40  |                 try {
  41  |                     const products = JSON.parse(raw);
  42  |                     const filtered = products.filter((p: any) => !p.name?.includes(runId) && !p.id?.includes(runId));
  43  |                     localStorage.setItem('erp_products', JSON.stringify(filtered));
  44  |                 } catch (e) {
  45  |                     console.error(e);
  46  |                 }
  47  |             }
  48  |         }, testRunId);
  49  |     });
  50  | 
  51  |     test('Caso 1: Criação de produto simples e geração automática da Variação 1 padrão', async ({ page }) => {
  52  |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  53  |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  54  |         await newProductBtn.click();
  55  | 
  56  |         // Modal de produto deve estar visível
  57  |         const parentModal = page.locator('.fixed.inset-0 .relative.bg-white, .fixed.inset-0 .relative.dark\\:bg-slate-900').first();
  58  |         await expect(parentModal).toBeVisible({ timeout: 5000 });
  59  | 
  60  |         // Preenche o nome na aba Geral
  61  |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  62  |         await expect(nameInput).toBeVisible();
  63  |         await nameInput.fill(`${testRunId} poltrona do papai com reclinador`);
  64  |         await nameInput.blur();
  65  | 
  66  |         // Verifica formatação automática em Title Case com conectivos 'do' e 'com' em minúsculo
  67  |         const formattedValue = await nameInput.inputValue();
  68  |         expect(formattedValue).toContain('Poltrona do Papai com Reclinador');
  69  | 
  70  |         // Navega para a aba de variações
  71  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  72  |         await variationsTabBtn.click();
  73  | 
  74  |         // Deve existir a Variação 1 gerada automaticamente na lista
  75  |         const tableRows = page.locator('div[role="dialog"] table tbody tr');
  76  |         console.log(await page.evaluate(() => document.body.innerHTML.substring(0, 3000)));
  77  |         await expect(tableRows).toHaveCount(1);
  78  |     });
  79  | 
  80  |     test('Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1', async ({ page }) => {
  81  |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  82  |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  83  |         await newProductBtn.click();
  84  | 
  85  |         // Navega para a aba de variações
  86  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  87  |         await variationsTabBtn.click();
  88  | 
  89  |         // Botão "Adicionar variação" deve estar desabilitado ou barrar a criação com aviso
  90  |         const addVarBtn = page.locator('button:has-text("Adicionar variação")').first();
  91  |         const isDisabled = await addVarBtn.isDisabled();
  92  | 
  93  |         if (isDisabled) {
  94  |             expect(isDisabled).toBe(true);
  95  |         } else {
  96  |             await addVarBtn.click();
  97  |             // Deve exibir toast de bloqueio informando necessidade de atributo na Variação 1
  98  |             const toastMessage = page.locator('text=Antes de criar outra variação, informe pelo menos um atributo');
  99  |             await expect(toastMessage).toBeVisible({ timeout: 5000 });
  100 |         }
  101 |     });
  102 | 
  103 |     test('Caso 3: Adição de Variação Manual com Atributos e Validação do Tamanho do Modal', async ({ page }) => {
  104 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  105 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  106 |         await newProductBtn.click();
  107 | 
  108 |         // Preenche nome do pai
  109 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  110 |         await nameInput.fill(`${testRunId} Guarda-Roupa de Casal com Espelho`);
  111 |         await nameInput.blur();
  112 | 
  113 |         // Aba de Variações
  114 |         await page.locator('button:has-text("Variações")').first().click();
  115 | 
  116 |         // Clica na Variação 1 para editar
  117 |         const firstVarRow = page.locator('div[role="dialog"] table tbody tr').first();
  118 |         await firstVarRow.click();
  119 | 
  120 |         // Modal de Variação deve estar aberto
  121 |         const varModal = page.locator('div[role="dialog"][aria-labelledby="variation-form-modal-title"]').first();
  122 |         await expect(varModal).toBeVisible({ timeout: 5000 });
  123 | 
  124 |         // Validação estrita do tamanho do Modal de Variação (mesmo tamanho do modal pai: max-w-5xl h-[92vh] rounded-3xl)
  125 |         const modalClass = await varModal.getAttribute('class');
  126 |         expect(modalClass).toContain('max-w-5xl');
  127 |         expect(modalClass).toContain('h-[92vh]');
  128 |         expect(modalClass).toContain('rounded-3xl');
  129 | 
  130 |         // Fecha/Conclui o modal da Variação 1
  131 |         const cancelOrCloseBtn = page.locator('button:has-text("Cancelar"), button:has-text("Concluir")').first();
  132 |         await cancelOrCloseBtn.click();
  133 |     });
```