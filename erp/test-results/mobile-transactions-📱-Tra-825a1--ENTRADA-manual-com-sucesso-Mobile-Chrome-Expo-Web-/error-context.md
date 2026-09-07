# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-transactions.spec.ts >> 📱 Transações Manuais — App Mobile (Expo Web) >> T2 — Criar transação de ENTRADA manual com sucesso
- Location: tests\mobile-transactions.spec.ts:127:3

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByText('Outras', { exact: true }).first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e11]:
        - generic [ref=e12]: Equipe Morante
        - generic [ref=e13]: Móveis Morante
      - generic [ref=e14]:
        - generic [ref=e15] [cursor=pointer]
        - generic [ref=e18] [cursor=pointer]: "50"
        - generic [ref=e24] [cursor=pointer]: M
    - generic [ref=e26]:
      - generic [ref=e27]:
        - generic [ref=e28] [cursor=pointer]: Transações
        - generic [ref=e33] [cursor=pointer]:
          - generic [ref=e37]: Assistente
          - generic [ref=e38]: BETA
      - generic [ref=e40]:
        - generic [ref=e41]:
          - generic [ref=e42] [cursor=pointer]: Agosto
          - generic [ref=e46]: SETEMBRO 2026
          - generic [ref=e48] [cursor=pointer]: Outubro
        - generic [ref=e54]:
          - generic [ref=e55]:
            - generic [ref=e56]:
              - generic [ref=e57]:
                - generic [ref=e58]: Entradas
                - generic [ref=e64]: + R$ 1.500,00
              - generic [ref=e65]:
                - generic [ref=e66]: Saídas
                - generic [ref=e72]: "- R$ 250,00"
            - generic [ref=e73]:
              - generic [ref=e74]: Saldo Financeiro Único
              - generic [ref=e79]: + R$ 1.250,00
          - generic [ref=e80]:
            - generic [ref=e81]:
              - generic [ref=e82] [cursor=pointer]: Todos
              - generic [ref=e84] [cursor=pointer]: Entradas
              - generic [ref=e86] [cursor=pointer]: Saídas
            - generic [ref=e88] [cursor=pointer]
          - generic [ref=e91]:
            - generic [ref=e92]: HOJE · 7 SET
            - generic [ref=e93] [cursor=pointer]:
              - generic [ref=e99]:
                - generic [ref=e100]: E2E Saída 1788804985837
                - generic [ref=e101]: Outras • PIX
              - generic [ref=e103]:
                - generic [ref=e104]: "- R$ 250,00"
                - generic "Ações de E2E Saída 1788804985837" [ref=e105]
            - generic [ref=e110] [cursor=pointer]:
              - generic [ref=e116]:
                - generic [ref=e117]: E2E Entrada Venda 1788804943803
                - generic [ref=e118]: Outras Receitas • PIX
              - generic [ref=e120]:
                - generic [ref=e121]: + R$ 1.500,00
                - generic "Ações de E2E Entrada Venda 1788804943803" [ref=e122]
        - generic [ref=e127] [cursor=pointer]: Nova Transação
    - generic [ref=e130]:
      - generic [ref=e131] [cursor=pointer]: Início
      - generic [ref=e138] [cursor=pointer]: Entregas
      - generic [ref=e145] [cursor=pointer]: Agenda
      - generic [ref=e149] [cursor=pointer]: Pedidos
      - generic [ref=e154] [cursor=pointer]: Mais
  - generic [ref=e164]:
    - generic [ref=e165]:
      - generic [ref=e166]: + Nova Transação
      - generic [ref=e167] [cursor=pointer]
    - generic [ref=e172]:
      - generic [ref=e173]:
        - generic [ref=e174]: Tipo de Movimentação *
        - generic [ref=e175]:
          - button "Selecionar Entrada" [ref=e176] [cursor=pointer]:
            - generic [ref=e177]: + Entrada
          - button "Selecionar Saída" [ref=e178] [cursor=pointer]:
            - generic [ref=e179]: "- Saída"
      - generic [ref=e180]:
        - generic [ref=e181]: Selecione o Tipo de Movimentação
        - generic [ref=e182]: Escolha se é uma Entrada (+) ou Saída (-) para exibir os campos de preenchimento.
    - generic [ref=e183]:
      - generic [ref=e184] [cursor=pointer]: Cancelar
      - generic [ref=e186] [cursor=pointer]: Finalizar
  - dialog [ref=e189]:
    - generic [ref=e192]:
      - generic [ref=e193]:
        - generic [ref=e194]: Selecionar Categoria
        - generic [ref=e198] [cursor=pointer]
      - generic [ref=e202]:
        - textbox "Pesquisar categoria..." [active] [ref=e206]: Outras
        - generic [ref=e207] [cursor=pointer]
      - generic [ref=e211]: Nenhuma categoria encontrada para "Outras".
```

# Test source

```ts
  1   | /**
  2   |  * Testes E2E — Transações Manuais no App Mobile (Expo Web)
  3   |  * URL: http://localhost:8081
  4   |  *
  5   |  * Cobertura Completa:
  6   |  *  T1 — Criar transação de SAÍDA manual (com categoria e forma de pagamento PIX)
  7   |  *  T2 — Criar transação de ENTRADA manual (com categoria Outras e forma de pagamento PIX)
  8   |  *  T3 — Editar uma transação existente (alterar valor e salvar)
  9   |  *  T4 — Excluir uma transação (com confirmação e timer de segurança de 3s)
  10  |  *  T5 — Validação de campos obrigatórios (impede finalizar sem tipo/valor/descrição)
  11  |  */
  12  | 
  13  | import { test, expect, Page } from '@playwright/test';
  14  | 
  15  | const APP_FINANCE_URL = 'http://localhost:8081/?auth_email=matheusmorante002@gmail.com&tab=financeiro';
  16  | 
  17  | /**
  18  |  * Helper para navegar para a tela do financeiro autenticado como admin
  19  |  */
  20  | async function navegarParaFinancas(page: Page) {
  21  |   await page.goto(APP_FINANCE_URL, { waitUntil: 'domcontentloaded' });
  22  |   const fabBtn = page.getByText('Nova Transação').first();
  23  |   await expect(fabBtn).toBeVisible({ timeout: 25000 });
  24  | }
  25  | 
  26  | /**
  27  |  * Helper para abrir o modal de nova movimentação aguardando estabilização da animação
  28  |  */
  29  | async function abrirModalNovaTransacao(page: Page) {
  30  |   const fab = page.getByText('Nova Transação').first();
  31  |   await fab.click();
  32  |   await expect(page.getByText('+ Nova Transação').first()).toBeVisible({ timeout: 10000 });
  33  |   await page.waitForTimeout(600);
  34  | }
  35  | 
  36  | /**
  37  |  * Helper robusto para selecionar o tipo da movimentação
  38  |  */
  39  | async function selecionarTipoMovimentacao(page: Page, tipo: 'expense' | 'income') {
  40  |   const testId = tipo === 'expense' ? 'type-btn-expense' : 'type-btn-income';
  41  |   const label = tipo === 'expense' ? '- Saída' : '+ Entrada';
  42  | 
  43  |   const btn = page.getByTestId(testId).first();
  44  |   await btn.click({ force: true });
  45  |   await page.waitForTimeout(400);
  46  | 
  47  |   const isVisible = await page.getByTestId('input-amount').first().isVisible({ timeout: 1500 }).catch(() => false);
  48  |   if (!isVisible) {
  49  |     await page.getByText(label, { exact: true }).first().click({ force: true });
  50  |     await page.waitForTimeout(400);
  51  |   }
  52  | 
  53  |   await expect(page.getByTestId('input-amount').first()).toBeVisible({ timeout: 8000 });
  54  | }
  55  | 
  56  | /**
  57  |  * Helper para selecionar categoria no modal
  58  |  */
  59  | async function selecionarCategoria(page: Page, nomeCategoria: string) {
  60  |   const catTrigger = page.getByText('Pesquisar ou selecionar categoria...').first();
  61  |   await catTrigger.click();
  62  |   await page.waitForTimeout(500);
  63  | 
  64  |   // Digita no input de busca para filtrar instantaneamente no topo
  65  |   const searchInput = page.locator('input[placeholder*="Pesquisar categoria"]').first();
  66  |   await searchInput.fill(nomeCategoria);
  67  |   await page.waitForTimeout(300);
  68  | 
  69  |   // Clica no item filtrado dentro do modal
  70  |   const itemFiltrado = page.getByTestId(`cat-item-${nomeCategoria}`).first();
  71  |   if (await itemFiltrado.isVisible({ timeout: 2000 }).catch(() => false)) {
  72  |     await itemFiltrado.click();
  73  |   } else {
> 74  |     await page.getByText(nomeCategoria, { exact: true }).first().click();
      |                                                                  ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  75  |   }
  76  | 
  77  |   await page.waitForTimeout(400);
  78  | }
  79  | 
  80  | test.describe('📱 Transações Manuais — App Mobile (Expo Web)', () => {
  81  | 
  82  |   test.beforeEach(async ({ page }) => {
  83  |     await navegarParaFinancas(page);
  84  |   });
  85  | 
  86  |   // ── T1: Criar transação de SAÍDA manual ────────────────────────────────────
  87  |   test('T1 — Criar transação de SAÍDA manual com sucesso', async ({ page }) => {
  88  |     await abrirModalNovaTransacao(page);
  89  | 
  90  |     // 1. Seleciona o tipo "- Saída"
  91  |     await selecionarTipoMovimentacao(page, 'expense');
  92  | 
  93  |     // 2. Preenche valor
  94  |     const valorInput = page.getByTestId('input-amount').first();
  95  |     await valorInput.fill('250,00');
  96  | 
  97  |     // 3. Preenche descrição
  98  |     const descInput = page.getByTestId('input-description').first();
  99  |     const descricao = `E2E Saída ${Date.now()}`;
  100 |     await descInput.fill(descricao);
  101 | 
  102 |     // 4. Seleciona Categoria ("Outras")
  103 |     await selecionarCategoria(page, 'Outras');
  104 | 
  105 |     // 5. Seleciona Forma de Pagamento (PIX)
  106 |     const pixBtn = page.getByText('PIX', { exact: true }).first();
  107 |     await pixBtn.click();
  108 | 
  109 |     await page.screenshot({ path: 'tests/screenshots/t1-antes-finalizar.png' });
  110 | 
  111 |     // 6. Clica em Finalizar
  112 |     const finalizarBtn = page.getByText('Finalizar', { exact: true }).first();
  113 |     await finalizarBtn.click();
  114 | 
  115 |     // 7. Valida que o modal fechou com sucesso
  116 |     await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 12000 });
  117 |     await page.screenshot({ path: 'tests/screenshots/t1-apos-salvar.png' });
  118 | 
  119 |     // 8. Valida que a transação criada aparece na lista
  120 |     const itemCriado = page.getByText(descricao).first();
  121 |     await expect(itemCriado).toBeVisible({ timeout: 8000 });
  122 | 
  123 |     console.log(`✅ T1 concluído: Transação de saída criada com sucesso "${descricao}"`);
  124 |   });
  125 | 
  126 |   // ── T2: Criar transação de ENTRADA manual ───────────────────────────────────
  127 |   test('T2 — Criar transação de ENTRADA manual com sucesso', async ({ page }) => {
  128 |     await abrirModalNovaTransacao(page);
  129 | 
  130 |     // 1. Seleciona o tipo "+ Entrada"
  131 |     await selecionarTipoMovimentacao(page, 'income');
  132 | 
  133 |     // 2. Preenche valor
  134 |     const valorInput = page.getByTestId('input-amount').first();
  135 |     await valorInput.fill('1500,00');
  136 | 
  137 |     // 3. Preenche descrição
  138 |     const descInput = page.getByTestId('input-description').first();
  139 |     const descricao = `E2E Entrada Venda ${Date.now()}`;
  140 |     await descInput.fill(descricao);
  141 | 
  142 |     // 4. Seleciona Categoria de Entrada ("Outras")
  143 |     await selecionarCategoria(page, 'Outras');
  144 | 
  145 |     // 5. Seleciona Forma de Pagamento (PIX)
  146 |     const pixBtn = page.getByText('PIX', { exact: true }).first();
  147 |     await pixBtn.click();
  148 | 
  149 |     await page.screenshot({ path: 'tests/screenshots/t2-antes-finalizar.png' });
  150 | 
  151 |     // 6. Clica em Finalizar
  152 |     const finalizarBtn = page.getByText('Finalizar', { exact: true }).first();
  153 |     await finalizarBtn.click();
  154 | 
  155 |     // 7. Confirma que fechou e aparece na lista
  156 |     await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 12000 });
  157 |     await page.screenshot({ path: 'tests/screenshots/t2-apos-salvar.png' });
  158 | 
  159 |     const itemCriado = page.getByText(descricao).first();
  160 |     await expect(itemCriado).toBeVisible({ timeout: 8000 });
  161 | 
  162 |     console.log(`✅ T2 concluído: Transação de entrada criada com sucesso "${descricao}"`);
  163 |   });
  164 | 
  165 |   // ── T3: Editar transação existente ─────────────────────────────────────────
  166 |   test('T3 — Editar transação existente', async ({ page }) => {
  167 |     // 1. Cria uma transação para edição
  168 |     await abrirModalNovaTransacao(page);
  169 |     await selecionarTipoMovimentacao(page, 'expense');
  170 | 
  171 |     await page.getByTestId('input-amount').first().fill('80,00');
  172 |     const descOriginal = `E2E Para Editar ${Date.now()}`;
  173 |     await page.getByTestId('input-description').first().fill(descOriginal);
  174 | 
```