# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory.spec.ts >> Inventário Mobile - E2E (Web) >> Deve executar Fluxo Completo: Criar Novo Inventário e Validar Paridade do Card Final
- Location: e2e\inventory.spec.ts:63:7

# Error details

```
Test timeout of 60000ms exceeded while running "beforeEach" hook.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('tab-summary')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByTestId('tab-summary') with timeout 60000ms
  - waiting for getByTestId('tab-summary')
  - Test timeout of 60000ms exceeded.

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const START_URL = '/?auth_email=matheusmorante002@gmail.com&tab=estoque';
  4   | 
  5   | test.describe('Inventário Mobile - E2E (Web)', () => {
  6   | 
  7   |   test.beforeEach(async ({ page }) => {
  8   |     // 1. Acesso e Renderização da Aba de Inventário
  9   |     await page.goto(START_URL);
> 10  |     await expect(page.getByTestId('tab-summary')).toBeVisible({ timeout: 60000 });
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  11  |     
  12  |     // Navegar para a aba de inventário
  13  |     await page.getByTestId('tab-inventory').first().click();
  14  |     
  15  |     // Verificar se o cabeçalho "Novo Inventário" aparece indicando carregamento com sucesso
  16  |     await expect(page.locator('text=Novo Inventário').first()).toBeVisible({ timeout: 15000 });
  17  |   });
  18  | 
  19  |   test('Deve validar a paridade de informações e estruturação do Card de Inventário', async ({ page }) => {
  20  |     // Esperar a lista carregar - verificando se algum card "Inventário #" ou a mensagem vazia aparece
  21  |     const invGeral = page.locator('text=Inventário');
  22  |     
  23  |     // Assumindo que existam dados na base, ou verificaremos se a estrutura é criada no próximo teste
  24  |     if (await invGeral.count() > 0 && await page.locator('text=CONCLUÍDO').count() > 0) {
  25  |       // 2. Validação de Paridade do Card de Inventário (UI do ERP)
  26  |       const firstCard = page.locator('text=Inventário').first();
  27  |       await expect(firstCard).toBeVisible();
  28  |       
  29  |       // Checar status
  30  |       const statusBadge = page.locator('text=CONCLUÍDO').first().or(page.locator('text=EM ANDAMENTO').first());
  31  |       await expect(statusBadge).toBeVisible();
  32  | 
  33  |       // Checar as labels da grade
  34  |       await expect(page.locator('text=Data').first()).toBeVisible();
  35  |       await expect(page.locator('text=Responsável').first()).toBeVisible();
  36  |       await expect(page.locator('text=Produtos contados').first()).toBeVisible();
  37  |       await expect(page.locator('text=Ajustes gerados').first()).toBeVisible();
  38  | 
  39  |       // Checar se o nome do responsável foi renderizado (não deve estar vazio, o fallback é "Não informado" mas com auth injeta nome)
  40  |       // Como o teste logo faz auth como matheusmorante002, o nome real depende do banco. Apenas validamos se a label existe.
  41  |     }
  42  |   });
  43  | 
  44  |   test('Deve validar o botão de opções (Três Pontinhos) do Card de Inventário', async ({ page }) => {
  45  |     const invGeral = page.locator('text=Inventário');
  46  |     
  47  |     // Pular se a lista estiver vazia (teste de fallback)
  48  |     if (await invGeral.count() > 0) {
  49  |       // Clica no botão de três pontinhos usando testID
  50  |       const moreButtons = page.getByTestId('inventory-options-btn');
  51  |       if (await moreButtons.count() > 0) {
  52  |         await moreButtons.first().click();
  53  |         
  54  |         // Verifica se a modal (Bottom Sheet Customizada) abriu contendo "Opções do Inventário"
  55  |         await expect(page.getByText(/Opções do Inventário/i).first()).toBeVisible({ timeout: 5000 });
  56  |         
  57  |         // Clica em Cancelar para fechar a modal
  58  |         await page.getByText('Cancelar').first().click();
  59  |       }
  60  |     }
  61  |   });
  62  | 
  63  |   test('Deve executar Fluxo Completo: Criar Novo Inventário e Validar Paridade do Card Final', async ({ page }) => {
  64  |     // 4. Fluxo Completo: Criar Novo Inventário
  65  |     await page.getByTestId('new-inventory-btn').first().click();
  66  |     
  67  |     // Etapa 1: InventoryScopeScreen - Selecionar tipo de inventário
  68  |     // Espera a tela de escopo abrir
  69  |     await expect(page.locator('text=O que você deseja inventariar?').first()).toBeVisible({ timeout: 15000 });
  70  |     
  71  |     // Clicar em "Seleção Personalizada"
  72  |     await page.locator('text=Seleção Personalizada').first().click();
  73  | 
  74  |     // Etapa 2: InventoryOperationScreen
  75  |     // Espera aparecer o botão de + Adicionar Item
  76  |     const btnAdd = page.locator('text=+ Adicionar Item').first();
  77  |     await expect(btnAdd).toBeVisible({ timeout: 15000 });
  78  |     await btnAdd.click();
  79  | 
  80  |     // Quando clica, ele adiciona uma linha com "Pesquisar produto..."
  81  |     const btnSearchProduct = page.locator('text=Pesquisar produto...').first();
  82  |     await expect(btnSearchProduct).toBeVisible();
  83  |     await btnSearchProduct.click();
  84  | 
  85  |     // Etapa 3: Modal de Busca
  86  |     const searchInput = page.locator('input[placeholder="Nome, código..."]').first();
  87  |     await expect(searchInput).toBeVisible();
  88  |     
  89  |     // Aguarda a busca padrão (que traz os primeiros itens)
  90  |     await page.waitForTimeout(1500); 
  91  |     
  92  |     // Pega o primeiro botão de "+ Add" retornado na busca inicial e clica
  93  |     const firstSuggestionBtn = page.locator('text=+ Add').first();
  94  |     if (await firstSuggestionBtn.isVisible()) {
  95  |         await firstSuggestionBtn.click();
  96  |     } else {
  97  |         // Se a base de testes estiver completamente vazia e não trouxer produtos, não temos como finalizar o inventário.
  98  |         // Vamos fechar o modal e abortar o restante do teste com sucesso parcial.
  99  |         const closeBtn = page.getByTestId('close-modal-btn');
  100 |         if (await closeBtn.isVisible()) await closeBtn.click();
  101 |         return; // Teste é considerado Passed até aqui pois a interface abriu corretamente
  102 |     }
  103 | 
  104 |     // Etapa 4: Preencher contagem
  105 |     // Clica no botão "+" para adicionar 1 na contagem do item focado
  106 |     const plusButtons = page.getByTestId('increment-btn');
  107 |     if (await plusButtons.count() > 0) {
  108 |         await plusButtons.first().click();
  109 |         
  110 |         // Aguarda a atualização do estado (o input deve mostrar '1')
```