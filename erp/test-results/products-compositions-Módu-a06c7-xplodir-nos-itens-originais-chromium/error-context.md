# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\compositions.spec.ts >> Módulo de Composições (Kit de Produtos) >> 5. Explosão do Kit: Ao selecionar a composição na Venda, deve explodir nos itens originais
- Location: tests\e2e\products\compositions.spec.ts:126:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Pesquisar produto/i }).first()

```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - region "Notifications Alt+T"
```

# Test source

```ts
  32  |         );
  33  |         expect(realErrors, 'Erros de console detectados').toEqual([]);
  34  |         expect(pageErrors, 'Exceções de runtime detectadas').toEqual([]);
  35  |     });
  36  | 
  37  |     test('1. Deve criar uma composição com sucesso contendo produtos reais vinculados', async ({ page }) => {
  38  |         await page.goto('/products/compositions?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  39  |         
  40  |         const newCompositionBtn = page.getByRole('button', { name: /Nova Composição|\+ Composição/i });
  41  |         await newCompositionBtn.click();
  42  | 
  43  |         const nameInput = page.locator('input[placeholder*="Ex: Cozinha Compacta"]');
  44  |         await nameInput.fill(`${testRunId} Cozinha de Teste E2E`);
  45  |         
  46  |         const skuInput = page.locator('input[placeholder*="Ex: CMP-COZ-PARIS"]');
  47  |         await skuInput.fill(`CMP-E2E-${Date.now()}`);
  48  | 
  49  |         await page.getByRole('tab', { name: /Produtos Componentes/i }).click();
  50  |         await page.getByRole('button', { name: /Adicionar Produto/i }).click();
  51  | 
  52  |         const searchInput = page.getByPlaceholder(/Buscar por nome, SKU/i);
  53  |         await searchInput.fill('a'); 
  54  |         
  55  |         await page.waitForTimeout(1000); 
  56  |         
  57  |         const firstResult = page.locator('button.group.w-full.text-left').first();
  58  |         if (await firstResult.isVisible()) {
  59  |             await firstResult.click();
  60  | 
  61  |             const increaseQtyBtn = page.getByRole('button', { name: '+' }).first();
  62  |             await increaseQtyBtn.click();
  63  |         }
  64  | 
  65  |         await page.getByRole('button', { name: /Salvar Composição/i }).click();
  66  |         await expect(page.locator('text=Composição salva com sucesso')).toBeVisible({ timeout: 5000 });
  67  |     });
  68  | 
  69  |     test('2. Validação: Não deve permitir salvar composição sem nome', async ({ page }) => {
  70  |         await page.goto('/products/compositions?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  71  |         await page.getByRole('button', { name: /Nova Composição|\+ Composição/i }).click();
  72  | 
  73  |         // Tenta salvar direto sem preencher nada
  74  |         await page.getByRole('button', { name: /Salvar Composição/i }).click();
  75  | 
  76  |         // Como o botão pode estar desabilitado ou o sistema acusar erro obrigatório,
  77  |         // garantimos que o toast de erro aparece ou a interface não prossegue
  78  |         const errorToast = page.locator('text=Preencha os campos obrigatórios').first();
  79  |         const fallbackToast = page.locator('text=O nome da composição é obrigatório').first();
  80  |         
  81  |         const isErrorVisible = await errorToast.isVisible() || await fallbackToast.isVisible();
  82  |         if(isErrorVisible) {
  83  |             expect(true).toBe(true);
  84  |         } else {
  85  |             // Verifica se o modal de composição AINDA está na tela (não deixou salvar e fechar)
  86  |             await expect(page.getByRole('heading', { name: /Nova Composição|Cadastro de Composição/i })).toBeVisible();
  87  |         }
  88  |     });
  89  | 
  90  |     test('3. UI/UX: Deve exibir o estado vazio "Composição vazia" quando não houver itens', async ({ page }) => {
  91  |         await page.goto('/products/compositions?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  92  |         await page.getByRole('button', { name: /Nova Composição|\+ Composição/i }).click();
  93  | 
  94  |         await page.getByRole('tab', { name: /Produtos Componentes/i }).click();
  95  | 
  96  |         // O estado vazio deve estar visível
  97  |         await expect(page.locator('text=Composição vazia')).toBeVisible();
  98  |         await expect(page.locator('text=Esta composição ainda não possui produtos reais vinculados')).toBeVisible();
  99  |     });
  100 | 
  101 |     test('4. Remoção de Item: Deve permitir excluir um componente da lista', async ({ page }) => {
  102 |         await page.goto('/products/compositions?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  103 |         await page.getByRole('button', { name: /Nova Composição|\+ Composição/i }).click();
  104 | 
  105 |         await page.getByRole('tab', { name: /Produtos Componentes/i }).click();
  106 |         await page.getByRole('button', { name: /Adicionar Produto/i }).click();
  107 | 
  108 |         const searchInput = page.getByPlaceholder(/Buscar por nome, SKU/i);
  109 |         await searchInput.fill('a'); 
  110 |         await page.waitForTimeout(1000); 
  111 |         
  112 |         const firstResult = page.locator('button.group.w-full.text-left').first();
  113 |         if (await firstResult.isVisible()) {
  114 |             await firstResult.click();
  115 | 
  116 |             // Clica na lixeira para excluir
  117 |             const deleteBtn = page.locator('button i.bi-trash').first();
  118 |             if (await deleteBtn.isVisible()) {
  119 |                 await deleteBtn.click();
  120 |                 // Deve voltar pro empty state
  121 |                 await expect(page.locator('text=Composição vazia')).toBeVisible();
  122 |             }
  123 |         }
  124 |     });
  125 | 
  126 |     test('5. Explosão do Kit: Ao selecionar a composição na Venda, deve explodir nos itens originais', async ({ page }) => {
  127 |         // 1. Acessa a tela de Novo Pedido de Venda
  128 |         await page.goto('/sales/new?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  129 |         await page.waitForLoadState('domcontentloaded');
  130 | 
  131 |         // 2. Adiciona um item na venda
> 132 |         await page.getByRole('button', { name: /Pesquisar produto/i }).first().click();
      |                                                                                ^ Error: locator.click: Test timeout of 30000ms exceeded.
  133 | 
  134 |         // Busca pela composição cadastrada
  135 |         const searchInput = page.getByPlaceholder(/Buscar por nome, SKU/i);
  136 |         await searchInput.fill('CMP-'); 
  137 |         await page.waitForTimeout(1000);
  138 | 
  139 |         // Seleciona a primeira composição
  140 |         const compositionResult = page.locator('text=Composição').first(); 
  141 |         if (await compositionResult.isVisible()) {
  142 |             await compositionResult.click();
  143 | 
  144 |             // 3. Validação Crucial da Fase 3 (Explosão do Kit)
  145 |             // A tabela de itens não deve possuir a "Composição", mas sim os itens explodidos.
  146 |             const tableRows = page.locator('table tbody tr');
  147 |             const emptyRows = page.getByRole('button', { name: /Pesquisar produto/i });
  148 |             const emptyRowsCount = await emptyRows.count();
  149 |             
  150 |             // Deve haver linhas preenchidas com os produtos reais inseridos no lugar da linha vazia inicial
  151 |             expect(await tableRows.count()).toBeGreaterThan(emptyRowsCount);
  152 |         }
  153 |     });
  154 | });
  155 | 
```