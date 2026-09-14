# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1
- Location: tests\e2e\products\products-variations-e2e.spec.ts:78:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first()

```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - region "Notifications Alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio', () => {
  4   |     const testRunId = `[TESTE_AUT]_VAR_${Date.now()}`;
  5   |     let consoleErrors: string[] = [];
  6   |     let pageErrors: string[] = [];
  7   | 
  8   |     test.beforeEach(async ({ page }) => {
  9   |         consoleErrors = [];
  10  |         pageErrors = [];
  11  | 
  12  |         page.on('console', msg => {
  13  |             if (msg.type() === 'error') {
  14  |                 consoleErrors.push(msg.text());
  15  |             }
  16  |         });
  17  | 
  18  |         page.on('pageerror', err => {
  19  |             pageErrors.push(err.message);
  20  |         });
  21  | 
  22  |         await page.goto('/products?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  23  |         await page.waitForLoadState('domcontentloaded');
  24  |     });
  25  | 
  26  |     test.afterEach(async ({ page }) => {
  27  |         const realErrors = consoleErrors.filter(e => 
  28  |             !e.includes('favicon') && 
  29  |             !e.includes('Download the React DevTools') &&
  30  |             !e.includes('net::ERR_CONNECTION_REFUSED')
  31  |         );
  32  |         expect(realErrors, 'Erros críticos de console detectados').toEqual([]);
  33  |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  34  | 
  35  |         // Teardown de dados criados com testRunId
  36  |         await page.evaluate((runId) => {
  37  |             const raw = localStorage.getItem('erp_products');
  38  |             if (raw) {
  39  |                 try {
  40  |                     const products = JSON.parse(raw);
  41  |                     const filtered = products.filter((p: any) => !p.name?.includes(runId) && !p.id?.includes(runId));
  42  |                     localStorage.setItem('erp_products', JSON.stringify(filtered));
  43  |                 } catch (e) {
  44  |                     console.error(e);
  45  |                 }
  46  |             }
  47  |         }, testRunId);
  48  |     });
  49  | 
  50  |     test('Caso 1: Criação de produto simples e geração automática da Variação 1 padrão', async ({ page }) => {
  51  |         const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first();
  52  |         await expect(newProductBtn).toBeVisible({ timeout: 10000 });
  53  |         await newProductBtn.click();
  54  | 
  55  |         // Modal de produto deve estar visível com dimensões padrão
  56  |         const parentModal = page.locator('div[role="dialog"], .fixed.inset-0 .relative.bg-white').first();
  57  |         await expect(parentModal).toBeVisible();
  58  | 
  59  |         // Preenche o nome na aba Geral
  60  |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  61  |         await expect(nameInput).toBeVisible();
  62  |         await nameInput.fill(`${testRunId} poltrona do papai com reclinador`);
  63  |         await nameInput.blur();
  64  | 
  65  |         // Verifica formatação automática em Title Case com conectivos 'do' e 'com' em minúsculo
  66  |         const formattedValue = await nameInput.inputValue();
  67  |         expect(formattedValue).toContain('Poltrona do Papai com Reclinador');
  68  | 
  69  |         // Navega para a aba de variações
  70  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  71  |         await variationsTabBtn.click();
  72  | 
  73  |         // Deve existir a Variação 1 gerada automaticamente na lista
  74  |         const tableRows = page.locator('table tbody tr');
  75  |         await expect(tableRows).toHaveCount(1);
  76  |     });
  77  | 
  78  |     test('Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1', async ({ page }) => {
  79  |         const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first();
> 80  |         await newProductBtn.click();
      |                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  81  | 
  82  |         // Navega para a aba de variações
  83  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  84  |         await variationsTabBtn.click();
  85  | 
  86  |         // Botão "Adicionar variação" deve estar desabilitado ou barrar a criação com aviso
  87  |         const addVarBtn = page.locator('button:has-text("Adicionar variação")').first();
  88  |         const isDisabled = await addVarBtn.isDisabled();
  89  | 
  90  |         if (isDisabled) {
  91  |             expect(isDisabled).toBe(true);
  92  |         } else {
  93  |             await addVarBtn.click();
  94  |             // Deve exibir toast de bloqueio informando necessidade de atributo na Variação 1
  95  |             const toastMessage = page.locator('text=Antes de criar outra variação, informe pelo menos um atributo');
  96  |             await expect(toastMessage).toBeVisible({ timeout: 5000 });
  97  |         }
  98  |     });
  99  | 
  100 |     test('Caso 3: Adição de Variação Manual com Atributos e Validação do Tamanho do Modal', async ({ page }) => {
  101 |         const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first();
  102 |         await newProductBtn.click();
  103 | 
  104 |         // Preenche nome do pai
  105 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  106 |         await nameInput.fill(`${testRunId} Guarda-Roupa de Casal com Espelho`);
  107 |         await nameInput.blur();
  108 | 
  109 |         // Aba de Variações
  110 |         await page.locator('button:has-text("Variações")').first().click();
  111 | 
  112 |         // Clica na Variação 1 para editar
  113 |         const firstVarRow = page.locator('table tbody tr').first();
  114 |         await firstVarRow.click();
  115 | 
  116 |         // Modal de Variação deve estar aberto
  117 |         const varModal = page.locator('div[role="dialog"][aria-labelledby="variation-form-modal-title"]').first();
  118 |         await expect(varModal).toBeVisible({ timeout: 5000 });
  119 | 
  120 |         // Validação estrita do tamanho do Modal de Variação (mesmo tamanho do modal pai: max-w-5xl h-[92vh] rounded-3xl)
  121 |         const modalClass = await varModal.getAttribute('class');
  122 |         expect(modalClass).toContain('max-w-5xl');
  123 |         expect(modalClass).toContain('h-[92vh]');
  124 |         expect(modalClass).toContain('rounded-3xl');
  125 | 
  126 |         // Adiciona atributo na Variação 1 (ex: Cor = Off-White)
  127 |         const attrSelect = page.locator('select').first();
  128 |         if (await attrSelect.isVisible()) {
  129 |             const options = await attrSelect.locator('option').allTextContents();
  130 |             if (options.length > 1) {
  131 |                 await attrSelect.selectOption({ index: 1 });
  132 |             }
  133 |         }
  134 | 
  135 |         // Fecha/Conclui o modal da Variação 1
  136 |         const cancelOrCloseBtn = page.locator('button:has-text("Cancelar"), button:has-text("Concluir")').first();
  137 |         await cancelOrCloseBtn.click();
  138 |     });
  139 | 
  140 |     test('Caso 4: Regra de Imutabilidade da Variação 1', async ({ page }) => {
  141 |         const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first();
  142 |         await newProductBtn.click();
  143 | 
  144 |         await page.locator('button:has-text("Variações")').first().click();
  145 | 
  146 |         // Tenta remover a Variação 1 se houver botão de exclusão
  147 |         const deleteBtn = page.locator('table tbody tr button[title*="Excluir"], table tbody tr button i.bi-trash').first();
  148 |         if (await deleteBtn.isVisible()) {
  149 |             await deleteBtn.click();
  150 |             // Deve informar que a Variação 1 é obrigatória
  151 |             const warningToast = page.locator('text=A Variação 1 é obrigatória e não pode ser removida');
  152 |             await expect(warningToast).toBeVisible({ timeout: 5000 });
  153 |         }
  154 |     });
  155 | 
  156 |     test('Caso 5: Cadastro Rápido de Variação em Pai Existente sem Variação Duplicada', async ({ page }) => {
  157 |         // Testa a rota de notas fiscais de entrada / conferência onde o operador faz cadastro rápido
  158 |         await page.goto('/stock/receipts?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  159 |         await page.waitForLoadState('domcontentloaded');
  160 | 
  161 |         // Garante que a tela carregou sem erros de runtime
  162 |         expect(await page.locator('body').isVisible()).toBe(true);
  163 |     });
  164 | 
  165 |     test('Caso 6: Formatação rigorosa de Title Case em atributos e valores de variações', async ({ page }) => {
  166 |         await page.goto('/products?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  167 |         await page.waitForLoadState('domcontentloaded');
  168 | 
  169 |         const newProductBtn = page.getByRole('button', { name: /novo produto|adicionar produto|\+ produto/i }).first();
  170 |         await newProductBtn.click();
  171 | 
  172 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  173 |         await nameInput.fill('MESA DE JANTAR PARA 6 LUGARES COM TAMPO DE VIDRO');
  174 |         await nameInput.blur();
  175 | 
  176 |         const formatted = await nameInput.inputValue();
  177 |         expect(formatted).toBe('Mesa de Jantar para 6 Lugares com Tampo de Vidro');
  178 |     });
  179 | });
  180 | 
```