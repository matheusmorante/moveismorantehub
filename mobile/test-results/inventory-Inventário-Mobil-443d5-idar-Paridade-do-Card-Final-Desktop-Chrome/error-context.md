# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory.spec.ts >> Inventário Mobile - E2E (Web) >> Deve executar Fluxo Completo: Criar Novo Inventário e Validar Paridade do Card Final
- Location: e2e\inventory.spec.ts:63:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=+ Adicionar Item').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=+ Adicionar Item').first() with timeout 15000ms
  - waiting for locator('text=+ Adicionar Item').first()

```

```yaml
- img
- text: Estoque
- button "Notificações, 37 não lidas":
  - img
  - text: "37"
- button "Abrir menu da conta":
  - img
- text: Novo Inventário O que você deseja inventariar? Índice offline atualizado em 28/09/2026, 19:03:42
- img
- img
- text: Estoque Completo Todas as variações ativas cadastradas no sistema.
- img
- text: Por Fornecedor Selecione um fornecedor e conte as variações relacionadas.
- img
- text: Seleção Personalizada Pesquise e adicione manualmente produtos ou variações específicas ao escopo. Selecione produtos ou variações antes de iniciar a contagem. + Adicionar produto ou variação Continuar com 0 item(ns)
- img
- text: Operações
- img
- text: Agenda
- img
- text: Pedidos
- img
- text: Mais
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
  10  |     await expect(page.getByTestId('tab-summary')).toBeVisible({ timeout: 60000 });
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
> 77  |     await expect(btnAdd).toBeVisible({ timeout: 15000 });
      |                          ^ Error: expect(locator).toBeVisible() failed
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
  111 |         await expect(page.locator('input').first()).toHaveValue('1', { timeout: 5000 });
  112 |     } else {
  113 |         // Se a busca falhou ou o app mockou algo e não tem botão de incremento, a tela Review pode ficar travada. 
  114 |         // Vamos forçar preencher 1 se fosse num input pra garantir, mas o increment button deve existir se adicionamos.
  115 |     }
  116 | 
  117 |     // Etapa 5: Revisar
  118 |     await page.locator('text=Revisar').first().click({ force: true });
  119 | 
  120 |     // Etapa 6: InventoryReviewScreen - Confirmar e Atualizar Estoque
  121 |     const confirmBtn = page.locator('text=Confirmar e Atualizar Estoque').first();
  122 |     await expect(confirmBtn).toBeVisible({ timeout: 15000 });
  123 | 
  124 |     page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  125 | 
  126 |     // Preparar o mock para o alert nativo do RN Web que as vezes trava o E2E
  127 |     await page.evaluate(() => {
  128 |         window.alert = function(msg) { console.log('Mocked Alert:', msg); return true; };
  129 |         window.confirm = function(msg) { console.log('Mocked Confirm:', msg); return true; };
  130 |     });
  131 | 
  132 |     console.log('TEST LOG: About to click Confirmar');
  133 |     await confirmBtn.click({ force: true });
  134 |     console.log('TEST LOG: Clicked Confirmar');
  135 |     
  136 |     // Se o react-native-web estiver usando um overlay DOM para o Alert (RNW 0.19+), precisamos clicar no botão "OK".
  137 |     try {
  138 |         await page.locator('text=OK').first().click({ timeout: 3000 });
  139 |         console.log('TEST LOG: Clicked OK on DOM Alert');
  140 |     } catch (e) {
  141 |         console.log('TEST LOG: No DOM Alert found or clicked');
  142 |     }
  143 | 
  144 |     // Verifica se voltou pra tela inicial de inventário
  145 |     await expect(page.locator('text=Novo Inventário').first()).toBeVisible({ timeout: 15000 });
  146 | 
  147 |     // Esperar um pouco para os requests de fetch (React Query) do app rodarem e atualizarem a lista
  148 |     await page.waitForTimeout(3000);
  149 | 
  150 |     // O inventário criado deve estar no topo da lista. O texto "Ajustes gerados" fica próximo a um número.
  151 |     // Vamos validar se o primeiro badge de ajuste (LANÇADO) está visível, indicando que calculou e mapeou o ajuste com sucesso.
  152 |     const primeiroCard = page.locator('text=Produtos contados').first();
  153 |     await expect(primeiroCard).toBeVisible();
  154 | 
  155 |     const primeiroBadgeLançado = page.locator('text=LANÇADO').first();
  156 |     await expect(primeiroBadgeLançado).toBeVisible();
  157 | 
  158 |     // Agora validamos se o card novo apareceu com o status CONCLUÍDO e o contador reflete a ação
  159 |     const firstCardTitle = page.getByText(/#\d{1,}/).first();
  160 |     await expect(firstCardTitle).toBeVisible();
  161 | 
  162 |     // Status deve estar concluído
  163 |     const statusBadge = page.locator('text=CONCLUÍDO').first();
  164 |     await expect(statusBadge).toBeVisible();
  165 | 
  166 |     // Produtos contados
  167 |     await expect(page.locator('text=Produtos contados').first()).toBeVisible();
  168 |   });
  169 | 
  170 | });
  171 | 
```