# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\compositions.spec.ts >> Módulo de Composições (Kit de Produtos) >> 1. Deve criar uma composição com sucesso contendo produtos reais vinculados
- Location: tests\e2e\products\compositions.spec.ts:37:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: Erros de console detectados

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 6

- Array []
+ Array [
+   "[ProductService] Erro na paginação do BD: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
+     at customFetch (htt…p/Products/ProductList/hooks/useProducts.ts:46:22, hint: , code: }",
+   "[ProductService] Erro na paginação do BD: {message: TypeError: Failed to fetch, details: TypeError: Failed to fetch
+     at customFetch (htt…p/Products/ProductList/hooks/useProducts.ts:46:22, hint: , code: }",
+ ]
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Nova Composição|\+ Composição/i })

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - generic [ref=f1e3]:
    - region "Notifications Alt+T"
    - main [ref=f1e4]:
      - generic [ref=f1e7]:
        - generic [ref=f1e9]:
          - generic [ref=f1e10]:
            - generic [ref=f1e11]: 
            - textbox "Pesquisar composições..." [ref=f1e12]
          - button "" [ref=f1e15] [cursor=pointer]
        - generic [ref=f1e17]:
          - generic [ref=f1e19]:
            - generic [ref=f1e20]: 
            - generic [ref=f1e22]:
              - paragraph [ref=f1e23]: Nenhum item encontrado
              - paragraph [ref=f1e24]: Tente ajustar seus filtros ou adicione um novo produto ou serviço.
          - generic [ref=f1e25]:
            - generic [ref=f1e26]:
              - button " Resumo das Composições " [ref=f1e27] [cursor=pointer]:
                - generic [ref=f1e28]:
                  - generic [ref=f1e29]: 
                  - heading "Resumo das Composições" [level=4] [ref=f1e31]
                - generic [ref=f1e32]: 
              - generic [ref=f1e33]:
                - button " Total de Cadastrados 0" [ref=f1e34] [cursor=pointer]:
                  - generic [ref=f1e35]:
                    - generic [ref=f1e36]: 
                    - generic [ref=f1e37]: Total de Cadastrados
                  - generic [ref=f1e38]: "0"
                - generic [ref=f1e39]:
                  - button "Publicados 0" [ref=f1e40] [cursor=pointer]:
                    - generic [ref=f1e41]: Publicados
                    - generic [ref=f1e42]: "0"
                  - button "Desativados 0" [ref=f1e43] [cursor=pointer]:
                    - generic [ref=f1e44]: Desativados
                    - generic [ref=f1e45]: "0"
                  - button " Rascunhos (Em Cadastro) 0" [ref=f1e46] [cursor=pointer]:
                    - generic [ref=f1e47]:
                      - generic [ref=f1e48]: 
                      - generic [ref=f1e49]: Rascunhos (Em Cadastro)
                    - generic [ref=f1e50]: "0"
            - generic [ref=f1e51]:
              - button " Filtros " [ref=f1e52] [cursor=pointer]:
                - generic [ref=f1e53]:
                  - generic [ref=f1e54]: 
                  - heading "Filtros" [level=4] [ref=f1e56]
                - generic [ref=f1e57]: 
              - complementary "Filtros de produtos" [ref=f1e59]:
                - generic [ref=f1e60]:
                  - generic [ref=f1e61]: Parâmetros
                  - generic [ref=f1e63]:
                    - generic [ref=f1e64]:
                      - generic [ref=f1e65]: Categoria
                      - combobox "Categoria" [ref=f1e66] [cursor=pointer]:
                        - option "Todas as Categorias" [selected]
                        - option "Somente Produtos"
                        - option "Somente Serviços"
                    - generic [ref=f1e67]:
                      - generic [ref=f1e68]: Situação no ERP
                      - combobox "Situação no ERP" [ref=f1e69] [cursor=pointer]:
                        - option "Todos os Produtos" [selected]
                        - option "Produtos Ativos"
                        - option "Produtos Desativados"
                        - option "Rascunhos (Em Cadastro)"
                    - generic [ref=f1e70]:
                      - generic [ref=f1e71]: Catálogo Digital
                      - combobox "Catálogo Digital" [ref=f1e72] [cursor=pointer]:
                        - option "Todos" [selected]
                        - option "Publicado no Catálogo"
                        - option "Ocultado do Catálogo"
                - button "Limpar Filtros" [ref=f1e74] [cursor=pointer]:
                  - generic [aria-hidden] [ref=f1e75]: 
                  - text: Limpar Filtros
    - generic [ref=f1e77]:
      - generic:
        - generic:
          - generic: Seu Lizandro
          - generic: Agente IA do ERP
      - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=f1e78] [cursor=pointer]:
        - img "Seu Lizandro - Agente IA" [ref=f1e80]
  - region "Notifications Alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Módulo de Composições (Kit de Produtos)', () => {
  4   |     const testRunId = `[TESTE_AUT]_CMP_${Date.now()}`;
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
  22  |         // Autenticação simplificada (bypass) conforme padrão do MoranteHub
  23  |         await page.goto('/products?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  24  |         await page.waitForLoadState('domcontentloaded');
  25  |     });
  26  | 
  27  |     test.afterEach(async () => {
  28  |         const realErrors = consoleErrors.filter(e => 
  29  |             !e.includes('favicon') && 
  30  |             !e.includes('Download the React DevTools') &&
  31  |             !e.includes('net::ERR_CONNECTION_REFUSED')
  32  |         );
  33  |         expect(realErrors, 'Erros de console detectados').toEqual([]);
  34  |         expect(pageErrors, 'Exceções de runtime detectadas').toEqual([]);
  35  |     });
  36  | 
  37  |     test('1. Deve criar uma composição com sucesso contendo produtos reais vinculados', async ({ page }) => {
  38  |         await page.goto('/products/compositions?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  39  |         
  40  |         const newCompositionBtn = page.getByRole('button', { name: /Nova Composição|\+ Composição/i });
> 41  |         await newCompositionBtn.click();
      |                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  132 |         await page.getByRole('button', { name: /Pesquisar produto/i }).first().click();
  133 | 
  134 |         // Busca pela composição cadastrada
  135 |         const searchInput = page.getByPlaceholder(/Buscar por nome, SKU/i);
  136 |         await searchInput.fill('CMP-'); 
  137 |         await page.waitForTimeout(1000);
  138 | 
  139 |         // Seleciona a primeira composição
  140 |         const compositionResult = page.locator('text=Composição').first(); 
  141 |         if (await compositionResult.isVisible()) {
```