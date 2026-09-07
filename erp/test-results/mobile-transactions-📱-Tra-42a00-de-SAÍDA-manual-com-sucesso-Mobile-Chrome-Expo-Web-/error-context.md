# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-transactions.spec.ts >> 📱 Transações Manuais — App Mobile (Expo Web) >> T1 — Criar transação de SAÍDA manual com sucesso
- Location: tests\mobile-transactions.spec.ts:43:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Nova Transação')
Expected: visible
Timeout: 25000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Nova Transação') with timeout 25000ms
  - waiting for getByText('Nova Transação')

```

```yaml
- img
- text: Acesso da Equipe Móveis Morante
- img
- text: ENTRAR COM O GOOGLE
```

# Test source

```ts
  1   | /**
  2   |  * Testes E2E — Transações Manuais no App Mobile (Expo Web)
  3   |  * URL: http://localhost:8081
  4   |  *
  5   |  * Cobertura Completa:
  6   |  *  T1 — Criar transação de SAÍDA manual (com categoria e forma de pagamento)
  7   |  *  T2 — Criar transação de ENTRADA manual
  8   |  *  T3 — Editar uma transação existente (alterar valor)
  9   |  *  T4 — Excluir uma transação (com timer de confirmação de 3s)
  10  |  *  T5 — Validação de campos obrigatórios (impede finalizar sem preencher)
  11  |  */
  12  | 
  13  | import { test, expect, Page } from '@playwright/test';
  14  | 
  15  | const APP_FINANCE_URL = 'http://localhost:8081/?auth_email=matheusmorante002@gmail.com&tab=financeiro';
  16  | 
  17  | /**
  18  |  * Helper para carregar a aba de finanças autenticado
  19  |  */
  20  | async function navegarParaFinancas(page: Page) {
  21  |   await page.goto(APP_FINANCE_URL, { waitUntil: 'domcontentloaded' });
  22  |   // Aguarda a aba de finanças ou o botão de nova transação ficar visível
  23  |   const fabBtn = page.getByText('Nova Transação');
> 24  |   await expect(fabBtn).toBeVisible({ timeout: 25000 });
      |                        ^ Error: expect(locator).toBeVisible() failed
  25  | }
  26  | 
  27  | /**
  28  |  * Helper para abrir o modal de nova transação
  29  |  */
  30  | async function abrirModalNovaTransacao(page: Page) {
  31  |   const fab = page.getByText('Nova Transação').first();
  32  |   await fab.click();
  33  |   await expect(page.getByText('+ Nova Transação').first()).toBeVisible({ timeout: 8000 });
  34  | }
  35  | 
  36  | test.describe('📱 Transações Manuais — App Mobile (Expo Web)', () => {
  37  | 
  38  |   test.beforeEach(async ({ page }) => {
  39  |     await navegarParaFinancas(page);
  40  |   });
  41  | 
  42  |   // ── T1: Criar transação de SAÍDA manual ────────────────────────────────────
  43  |   test('T1 — Criar transação de SAÍDA manual com sucesso', async ({ page }) => {
  44  |     await abrirModalNovaTransacao(page);
  45  |     await page.screenshot({ path: 'tests/screenshots/t1-modal-aberto.png' });
  46  | 
  47  |     // 1. Seleciona o tipo Saída
  48  |     const saidaBtn = page.getByText('Saída', { exact: true }).first();
  49  |     await saidaBtn.click();
  50  |     await page.waitForTimeout(300);
  51  | 
  52  |     // 2. Preenche valor
  53  |     const valorInput = page.locator('input[placeholder="0,00"]').first();
  54  |     await valorInput.click();
  55  |     await valorInput.fill('250,00');
  56  | 
  57  |     // 3. Preenche descrição
  58  |     const descInput = page.locator('input[placeholder*="Abastecimento"]').first();
  59  |     await descInput.click();
  60  |     const descricao = `E2E Saída ${Date.now()}`;
  61  |     await descInput.fill(descricao);
  62  | 
  63  |     // 4. Seleciona Categoria
  64  |     const catTrigger = page.getByText('Pesquisar ou selecionar categoria...').first();
  65  |     if (await catTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
  66  |       await catTrigger.click();
  67  |       await page.waitForTimeout(500);
  68  |       // Seleciona uma categoria da lista no modal
  69  |       const catItem = page.locator('text=Selecionar Categoria').locator('..').locator('..').getByRole('button').or(page.locator('div[tabindex="0"]')).filter({ hasText: /[a-zA-Z]/ });
  70  |       const firstCat = page.locator('div, span, p').filter({ hasText: /Outr|Geral|Manuten|Aluguel|Mater/ }).first();
  71  |       if (await firstCat.isVisible({ timeout: 3000 }).catch(() => false)) {
  72  |         await firstCat.click();
  73  |       } else {
  74  |         // Clica no primeiro item clicável da lista
  75  |         await page.locator('input[placeholder*="Buscar"]').fill('Outros');
  76  |         await page.waitForTimeout(300);
  77  |         await page.getByText('Outros').first().click().catch(() => {});
  78  |       }
  79  |     }
  80  | 
  81  |     // 5. Seleciona Forma de Pagamento (PIX)
  82  |     const pixBtn = page.getByText('PIX', { exact: true }).or(page.getByText('Pix', { exact: true })).first();
  83  |     if (await pixBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  84  |       await pixBtn.click();
  85  |     }
  86  | 
  87  |     await page.screenshot({ path: 'tests/screenshots/t1-antes-salvar.png' });
  88  | 
  89  |     // 6. Clica em Finalizar
  90  |     const finalizarBtn = page.getByText('Finalizar', { exact: true }).first();
  91  |     await finalizarBtn.click();
  92  | 
  93  |     // 7. Valida que o modal fechou ou que a transação aparece na lista
  94  |     await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 10000 });
  95  |     await page.screenshot({ path: 'tests/screenshots/t1-apos-salvar.png' });
  96  | 
  97  |     console.log(`✅ T1 concluído: Transação criada "${descricao}"`);
  98  |   });
  99  | 
  100 |   // ── T2: Criar transação de ENTRADA manual ───────────────────────────────────
  101 |   test('T2 — Criar transação de ENTRADA manual com sucesso', async ({ page }) => {
  102 |     await abrirModalNovaTransacao(page);
  103 |     await page.screenshot({ path: 'tests/screenshots/t2-modal-aberto.png' });
  104 | 
  105 |     // 1. Seleciona tipo Entrada
  106 |     const entradaBtn = page.getByText('Entrada', { exact: true }).first();
  107 |     await entradaBtn.click();
  108 |     await page.waitForTimeout(300);
  109 | 
  110 |     // 2. Preenche valor
  111 |     const valorInput = page.locator('input[placeholder="0,00"]').first();
  112 |     await valorInput.click();
  113 |     await valorInput.fill('1200,00');
  114 | 
  115 |     // 3. Preenche descrição
  116 |     const descInput = page.locator('input[placeholder*="Abastecimento"]').first();
  117 |     await descInput.click();
  118 |     const descricao = `E2E Entrada Venda ${Date.now()}`;
  119 |     await descInput.fill(descricao);
  120 | 
  121 |     // 4. Categoria (se houver seletor)
  122 |     const catTrigger = page.getByText('Pesquisar ou selecionar categoria...').first();
  123 |     if (await catTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
  124 |       await catTrigger.click();
```