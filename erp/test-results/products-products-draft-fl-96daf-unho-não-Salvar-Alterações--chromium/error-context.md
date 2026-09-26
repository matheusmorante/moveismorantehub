# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-draft-flow.spec.ts >> Fluxo de Rascunho de Produto >> Caso 4: Formulário de rascunho exibe botão "Salvar rascunho", não "Salvar Alterações"
- Location: tests\e2e\products\products-draft-flow.spec.ts:272:5

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
- text: E
- heading "ERP Móveis Morante" [level=1]
- paragraph: Gestão de Móveis e Serviços
- text: E-mail 
- textbox "exemplo@email.com"
- text: Senha
- button "Esqueceu?"
- text: 
- textbox "••••••••"
- button ""
- button "Entrar no Sistema "
- text: Ou continuar com
- button "Entrar com Google":
  - img
  - text: Entrar com Google
- paragraph:
  - text: Não tem uma conta?
  - link "Criar conta grátis":
    - /url: /signup
- paragraph: Sistema de Alta Performance • v2.1
- region "Notifications Alt+T"
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Suíte E2E — Fluxo de Rascunho de Produto
  5   |  *
  6   |  * Cobre os seguintes cenários críticos:
  7   |  * 1. Salvar rascunho e verificar que aparece como rascunho na lista
  8   |  * 2. Continuar cadastro a partir do rascunho e verificar abertura do modal de canais
  9   |  * 3. Verificar que produto concluído (ex-rascunho) NÃO fica desativado
  10  |  * 4. Produto em rascunho exibe botão "Salvar rascunho" (não "Salvar Alterações")
  11  |  * 5. Produto concluído (ex-rascunho) pode ser ativado no catálogo sem bloqueio
  12  |  * 6. Editar produto já cadastrado NÃO reabre modal de canais
  13  |  *
  14  |  * Identificador: [TESTE_AUT] + timestamp garante rastreabilidade e teardown seguro.
  15  |  */
  16  | test.describe('Fluxo de Rascunho de Produto', () => {
  17  |     const testRunId = `[TESTE_AUT]_DRAFT_${Date.now()}`;
  18  |     const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  19  |     let consoleErrors: string[] = [];
  20  |     let pageErrors: string[] = [];
  21  | 
  22  |     test.beforeEach(async ({ page }) => {
  23  |         test.setTimeout(60000);
  24  |         consoleErrors = [];
  25  |         pageErrors = [];
  26  | 
  27  |         page.on('console', (msg) => {
  28  |             if (msg.type() === 'error') {
  29  |                 consoleErrors.push(msg.text());
  30  |             }
  31  |         });
  32  | 
  33  |         page.on('response', (res) => {
  34  |             if (res.status() >= 400) {
  35  |                 console.log(`[HTTP ${res.status()}] ${res.url()}`);
  36  |             }
  37  |         });
  38  | 
  39  |         page.on('pageerror', (err) => {
  40  |             pageErrors.push(err.message);
  41  |         });
  42  | 
  43  |         await page.goto(`/registrations/products?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  44  |     });
  45  | 
  46  |     test.afterEach(async ({ page }) => {
  47  |         const realErrors = consoleErrors.filter(
  48  |             (e) =>
  49  |                 !e.includes('favicon') &&
  50  |                 !e.includes('Download the React DevTools') &&
  51  |                 !e.includes('net::ERR_CONNECTION_REFUSED') &&
  52  |                 !e.includes('net::ERR_ABORTED')
  53  |         );
  54  |         expect(realErrors, 'Erros críticos de console detectados').toEqual([]);
  55  |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  56  |     });
  57  | 
  58  |     // ─────────────────────────────────────────────────────────────────
  59  |     // HELPER: Abre o formulário de novo produto e preenche o nome
  60  |     // ─────────────────────────────────────────────────────────────────
  61  |     async function abrirFormularioNovoProduto(page: Page, nomeProduto: string) {
  62  |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
> 63  |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
      |                                     ^ Error: expect(locator).toBeVisible() failed
  64  |         await newProductBtn.click();
  65  | 
  66  |         const formModal = page.locator('[role="dialog"][aria-labelledby="product-form-title"]').first();
  67  |         await expect(formModal).toBeVisible({ timeout: 8000 });
  68  |         await page.waitForTimeout(600);
  69  | 
  70  |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  71  |         await expect(nameInput).toBeVisible({ timeout: 5000 });
  72  |         await nameInput.fill(nomeProduto);
  73  |         await nameInput.blur();
  74  |         await page.waitForTimeout(400);
  75  |         return formModal;
  76  |     }
  77  | 
  78  |     async function preencherRequisitosECadastrar(page: Page) {
  79  |         // 1. Categoria na aba Geral
  80  |         const firstCatOption = page.locator('label input[type="checkbox"]').first();
  81  |         if (await firstCatOption.isVisible({ timeout: 2000 })) {
  82  |             await firstCatOption.click();
  83  |             await page.waitForTimeout(200);
  84  |         } else {
  85  |             const searchCategoryInput = page.locator('#input-search-product-categories').first();
  86  |             if (await searchCategoryInput.isVisible({ timeout: 2000 })) {
  87  |                 await searchCategoryInput.fill('Quarto');
  88  |                 await page.waitForTimeout(400);
  89  |                 const optionAfterSearch = page.locator('label input[type="checkbox"]').first();
  90  |                 if (await optionAfterSearch.isVisible({ timeout: 2000 })) {
  91  |                     await optionAfterSearch.click();
  92  |                 }
  93  |             }
  94  |         }
  95  | 
  96  |         // 2. Aba Estoque e Precificação
  97  |         const estoqueTab = page.locator('button:has-text("Estoque e Precificação")').first();
  98  |         if (await estoqueTab.isVisible({ timeout: 2000 })) {
  99  |             await estoqueTab.click();
  100 |             await page.waitForTimeout(400);
  101 | 
  102 |             // Preço de venda
  103 |             const priceInput = page.locator('#product-unit-price-input, input[aria-label*="Preço de venda"], input[placeholder*="0,00"]').first();
  104 |             if (await priceInput.isVisible({ timeout: 2000 })) {
  105 |                 await priceInput.fill('499,90');
  106 |                 await priceInput.blur();
  107 |                 await page.waitForTimeout(200);
  108 |             }
  109 | 
  110 |             // Seleção de fornecedor
  111 |             const supplierInput = page.locator('input[role="combobox"][aria-label="Buscar fornecedor por nome ou razão social"], input[role="combobox"]').first();
  112 |             if (await supplierInput.isVisible({ timeout: 2000 })) {
  113 |                 await supplierInput.click({ force: true });
  114 |                 await supplierInput.fill('Mo');
  115 |                 await page.waitForTimeout(600);
  116 |                 const supplierOption = page.locator('[role="listbox"][aria-label="Sugestões de fornecedores"] button[role="option"]').first();
  117 |                 if (await supplierOption.isVisible({ timeout: 4000 })) {
  118 |                     await supplierOption.click({ force: true });
  119 |                     await page.waitForTimeout(300);
  120 |                 }
  121 |                 await page.keyboard.press('Escape');
  122 |                 await page.waitForTimeout(200);
  123 |             }
  124 |         }
  125 | 
  126 |         // 3. Aba Variações - Configurar atributo na Variação 1 padrão
  127 |         const varTab = page.locator('button:has-text("Variações")').first();
  128 |         if (await varTab.isVisible({ timeout: 2000 })) {
  129 |             await varTab.click({ force: true });
  130 |             await page.waitForTimeout(400);
  131 | 
  132 |             const editVarBtn = page.locator('button[aria-label="Editar detalhes da variação"], button[title*="editar detalhes da variação"]').first();
  133 |             if (await editVarBtn.isVisible({ timeout: 5000 })) {
  134 |                 await editVarBtn.click({ force: true });
  135 | 
  136 |                 const varModal = page.locator('[role="dialog"][aria-labelledby="variation-form-modal-title"], [role="dialog"]:has-text("Editar Variação")').first();
  137 |                 await expect(varModal).toBeVisible({ timeout: 8000 });
  138 |                 await page.waitForTimeout(500);
  139 | 
  140 |                 const addAttrBtn = varModal.locator('[data-testid="add-variation-attribute-btn"]').or(varModal.locator('button:has-text("Adicionar")')).first();
  141 |                 await expect(addAttrBtn).toBeVisible({ timeout: 4000 });
  142 |                 await addAttrBtn.click();
  143 |                 await page.waitForTimeout(500);
  144 | 
  145 |                 const attrValInput = varModal.locator('input[placeholder*="Valor"]').first();
  146 |                 await expect(attrValInput).toBeVisible({ timeout: 5000 });
  147 |                 await attrValInput.fill('Preto');
  148 |                 await page.waitForTimeout(300);
  149 | 
  150 |                 // Cadastrar/confirmar valor se houver botão de registro
  151 |                 const regValBtn = varModal.locator('[data-testid="attribute-register-button"]').first();
  152 |                 if (await regValBtn.isVisible({ timeout: 1000 })) {
  153 |                     await regValBtn.click();
  154 |                     await page.waitForTimeout(300);
  155 |                 } else {
  156 |                     await attrValInput.press('Enter');
  157 |                     await page.waitForTimeout(300);
  158 |                 }
  159 | 
  160 |                 const concluirVarBtn = varModal.locator('button:has-text("Concluir")').first();
  161 |                 await expect(concluirVarBtn).toBeVisible({ timeout: 3000 });
  162 |                 await concluirVarBtn.click({ force: true });
  163 |                 await expect(varModal).not.toBeVisible({ timeout: 5000 });
```