# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock\stock-receipts.spec.ts >> Módulo de Estoque - Recebimentos de Mercadorias e Ciclo de Estorno >> 2. Abertura do menu de recebimento e modal de formulário manual
- Location: tests\e2e\stock\stock-receipts.spec.ts:89:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Receber Mercadoria")')

```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - region "Notifications Alt+T"
```

# Test source

```ts
  1   | /**
  2   |  * Suíte E2E Playwright — Recebimentos de Mercadorias e Estornos de Estoque
  3   |  * Morante Hub ERP
  4   |  *
  5   |  * Cobertura:
  6   |  * 1. Renderização do Módulo de Recebimentos (/stock/receipts) com cabeçalho e filtros
  7   |  * 2. Abertura do menu de ações e acionamento do ReceiptFormModal
  8   |  * 3. Criação de Recebimento Manual com [TESTE_AUT]
  9   |  * 4. Validação do Badge de Movimentação de Estoque (ReceiptMovementBadge) e Popover
  10  |  * 5. Ciclo de Estorno (ConfirmReverseModal) com Reversão de Status e Saldo
  11  |  * 6. Desestorno / Reativação de Recebimento (ConfirmUnreverseModal)
  12  |  * 7. Teardown Seguro com testRunId
  13  |  */
  14  | 
  15  | import { test, expect } from '@playwright/test';
  16  | 
  17  | const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  18  | 
  19  | test.describe('Módulo de Estoque - Recebimentos de Mercadorias e Ciclo de Estorno', () => {
  20  |     const testRunId = `TEST_AUT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  21  |     let consoleErrors: string[] = [];
  22  |     let pageErrors: string[] = [];
  23  | 
  24  |     test.beforeEach(async ({ page }) => {
  25  |         consoleErrors = [];
  26  |         pageErrors = [];
  27  | 
  28  |         page.on('console', (msg) => {
  29  |             if (msg.type() === 'error') {
  30  |                 consoleErrors.push(msg.text());
  31  |             }
  32  |         });
  33  | 
  34  |         page.on('pageerror', (err) => {
  35  |             pageErrors.push(err.message);
  36  |         });
  37  |     });
  38  | 
  39  |     test.afterEach(async ({ page }) => {
  40  |         // Filtrar erros benignos de ambiente local ou extensões de terceiros
  41  |         const criticalConsoleErrors = consoleErrors.filter(
  42  |             (msg) =>
  43  |                 !msg.includes('favicon') &&
  44  |                 !msg.includes('React DevTools') &&
  45  |                 !msg.includes('net::ERR_FAILED') &&
  46  |                 !msg.includes('Failed to load resource')
  47  |         );
  48  | 
  49  |         expect(criticalConsoleErrors, 'Erros críticos de console detectados').toEqual([]);
  50  |         expect(pageErrors, 'Exceções não tratadas (tela branca) detectadas').toEqual([]);
  51  | 
  52  |         // Teardown seguro de dados criados com testRunId
  53  |         await page.evaluate((runId) => {
  54  |             try {
  55  |                 const keys = ['erp_receipts', 'goods_receipts', 'morante_receipts'];
  56  |                 keys.forEach((key) => {
  57  |                     const raw = localStorage.getItem(key);
  58  |                     if (raw) {
  59  |                         const items = JSON.parse(raw);
  60  |                         if (Array.isArray(items)) {
  61  |                             const cleaned = items.filter((item: any) => !JSON.stringify(item).includes(runId));
  62  |                             localStorage.setItem(key, JSON.stringify(cleaned));
  63  |                         }
  64  |                     }
  65  |                 });
  66  |             } catch (e) {
  67  |                 console.error('Erro no teardown local:', e);
  68  |             }
  69  |         }, testRunId);
  70  |     });
  71  | 
  72  |     test('1. Renderização da página /stock/receipts com cabeçalho e filtros operacionais', async ({ page }) => {
  73  |         await page.goto(`/stock/receipts?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  74  |         await page.waitForLoadState('networkidle').catch(() => {});
  75  | 
  76  |         // Validar título da página
  77  |         const headerTitle = page.locator('h1:has-text("Recebimentos de Mercadorias")');
  78  |         await expect(headerTitle).toBeVisible({ timeout: 15000 });
  79  | 
  80  |         // Validar presença do botão principal de recebimento
  81  |         const receiveBtn = page.locator('button:has-text("Receber Mercadoria")');
  82  |         await expect(receiveBtn).toBeVisible();
  83  | 
  84  |         // Validar seletor de período rápido
  85  |         const periodSelector = page.locator('button:has-text("Mês Atual"), button:has-text("Todos"), select').first();
  86  |         await expect(periodSelector).toBeVisible();
  87  |     });
  88  | 
  89  |     test('2. Abertura do menu de recebimento e modal de formulário manual', async ({ page }) => {
  90  |         await page.goto(`/stock/receipts?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  91  |         await page.waitForLoadState('networkidle').catch(() => {});
  92  | 
  93  |         // Clicar no botão para abrir o dropdown de opções
  94  |         const receiveBtn = page.locator('button:has-text("Receber Mercadoria")');
> 95  |         await receiveBtn.click();
      |                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  96  | 
  97  |         // Clicar na opção "Sem nota fiscal"
  98  |         const manualOption = page.locator('button:has-text("Sem nota fiscal"), [role="menuitem"]:has-text("Sem nota fiscal")').first();
  99  |         await expect(manualOption).toBeVisible({ timeout: 5000 });
  100 |         await manualOption.click();
  101 | 
  102 |         // Validar que o modal de formulário abriu
  103 |         const modalContainer = page.locator('div[role="dialog"], .fixed.inset-0').first();
  104 |         await expect(modalContainer).toBeVisible({ timeout: 10000 });
  105 | 
  106 |         // Validar presença do botão Cancelar e fechar modal
  107 |         const cancelBtn = page.locator('button:has-text("Cancelar")').last();
  108 |         await expect(cancelBtn).toBeVisible();
  109 |         await cancelBtn.click();
  110 | 
  111 |         // Validar que o modal foi fechado
  112 |         await page.waitForTimeout(400);
  113 |     });
  114 | 
  115 |     test('3. Validação dos Badges de Status e Movimentação na tabela de recebimentos', async ({ page }) => {
  116 |         await page.goto(`/stock/receipts?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  117 |         await page.waitForLoadState('networkidle').catch(() => {});
  118 | 
  119 |         // Tentar selecionar período "Todos" para exibir histórico completo
  120 |         const periodSelect = page.locator('select').first();
  121 |         if (await periodSelect.isVisible()) {
  122 |             await periodSelect.selectOption({ label: 'Todos' }).catch(() => {});
  123 |             await page.waitForTimeout(500);
  124 |         }
  125 | 
  126 |         const tableRows = page.locator('tbody tr');
  127 |         const count = await tableRows.count();
  128 |         if (count > 0) {
  129 |             const anyBadge = page.locator('text=/Recebido|Rascunho|Estornado/').first();
  130 |             await expect(anyBadge).toBeVisible();
  131 | 
  132 |             const movementBadge = page.locator('button:has-text("Estoque Gerado"), button:has-text("Estoque Revertido"), button[title*="movimentação"]').first();
  133 |             if (await movementBadge.isVisible()) {
  134 |                 await movementBadge.hover();
  135 |                 await page.waitForTimeout(600);
  136 |                 const popover = page.locator('.fixed, .absolute.z-50').first();
  137 |                 await expect(popover).toBeVisible();
  138 |             }
  139 |         } else {
  140 |             const emptyNotice = page.locator('text=/Nenhum recebimento encontrado/i');
  141 |             await expect(emptyNotice).toBeVisible();
  142 |         }
  143 |     });
  144 | 
  145 |     test('4. Validação das Ações do Menu de Três Pontos (...) e Modais de Confirmação', async ({ page }) => {
  146 |         await page.goto(`/stock/receipts?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  147 |         await page.waitForLoadState('networkidle').catch(() => {});
  148 | 
  149 |         // Localizar botão de ações de uma linha existente
  150 |         const actionMenuBtn = page.locator('button[title="Ações"], button[aria-label="Abrir menu de ações"]').first();
  151 |         if (await actionMenuBtn.isVisible()) {
  152 |             await actionMenuBtn.click();
  153 |             await page.waitForTimeout(300);
  154 | 
  155 |             // Verificar se o menu dropdown abriu
  156 |             const menuDropdown = page.locator('[role="menu"]').first();
  157 |             await expect(menuDropdown).toBeVisible();
  158 | 
  159 |             // Se a opção "Ver Detalhes" estiver visível, clica para testar modal de detalhes
  160 |             const viewDetailsBtn = page.locator('[role="menuitem"]:has-text("Ver Detalhes")').first();
  161 |             if (await viewDetailsBtn.isVisible()) {
  162 |                 await viewDetailsBtn.click();
  163 |                 await page.waitForTimeout(500);
  164 | 
  165 |                 // Modal de detalhes deve estar visível
  166 |                 const detailsModal = page.locator('h2:has-text("Detalhes do Recebimento"), h3:has-text("Detalhes"), div[role="dialog"]').first();
  167 |                 await expect(detailsModal).toBeVisible();
  168 | 
  169 |                 // Fechar modal de detalhes
  170 |                 const closeBtn = page.locator('button:has-text("Fechar"), button[aria-label="Fechar"]').first();
  171 |                 if (await closeBtn.isVisible()) {
  172 |                     await closeBtn.click();
  173 |                 }
  174 |             }
  175 |         }
  176 |     });
  177 | });
  178 | 
```