# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\compositions.spec.ts >> Módulo de Composições (Kit de Produtos) >> 4. Remoção de Item: Deve permitir excluir um componente da lista
- Location: tests\e2e\products\compositions.spec.ts:101:5

# Error details

```
Test timeout of 30000ms exceeded.
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
          - generic [ref=f1e20]:
            - button " Mostrar desativados" [ref=f1e22] [cursor=pointer]:
              - generic [ref=f1e23]: 
              - text: Mostrar desativados
            - generic [ref=f1e24]:
              - text:                   
              - button " Variações (2) 000001-COMP Status ERP derivado das variações  Última Unidade - Mostruário Editar Produto Opções do produto Cozinha Modulada Florença 6 Peças 100% MDF Cozinhas Moduladas e Compactas •  Móveis Sul" [ref=f1e26] [cursor=pointer]:
                - generic [ref=f1e27]:
                  - generic [ref=f1e28]:
                    - button " Variações (2)" [ref=f1e29]:
                      - generic [ref=f1e30]: 
                      - generic [ref=f1e31]: Variações (2)
                    - generic [ref=f1e32]: 000001-COMP
                  - generic [ref=f1e33]:
                    - generic "Status ERP derivado das variações" [ref=f1e35]:
                      - generic [ref=f1e36]:
                        - generic [ref=f1e37]: ERP
                        - generic [ref=f1e38]: Ativo
                    - generic [ref=f1e41]:
                      - generic [ref=f1e42]: 
                      - text: Última Unidade - Mostruário
                    - generic [ref=f1e43]:
                      - button "Editar Produto" [ref=f1e44]:
                        - generic [ref=f1e45]: 
                      - button "Opções do produto" [ref=f1e46]:
                        - generic [ref=f1e47]: 
                - generic [ref=f1e49]:
                  - heading "Cozinha Modulada Florença 6 Peças 100% MDF" [level=3] [ref=f1e50]
                  - generic [ref=f1e51]:
                    - generic [ref=f1e52]: Cozinhas Moduladas e Compactas
                    - generic [ref=f1e53]: •
                    - generic [ref=f1e54]:
                      - generic [ref=f1e55]: 
                      - text: Móveis Sul
            - generic [ref=f1e56]:
              - generic [ref=f1e57]:
                - generic [ref=f1e58]: Página 1 · 1 itens no catálogo
                - combobox [ref=f1e60]:
                  - option "10 por página"
                  - option "15 por página" [selected]
              - generic [ref=f1e61]:
                - button "" [disabled] [ref=f1e62]
                - button "1" [disabled] [ref=f1e66]
                - button "" [disabled] [ref=f1e68]
          - generic [ref=f1e70]:
            - generic [ref=f1e71]:
              - button " Resumo das Composições " [ref=f1e72] [cursor=pointer]:
                - generic [ref=f1e73]:
                  - generic [ref=f1e74]: 
                  - heading "Resumo das Composições" [level=4] [ref=f1e76]
                - generic [ref=f1e77]: 
              - generic [ref=f1e78]:
                - button " Total de Cadastrados 297" [ref=f1e79] [cursor=pointer]:
                  - generic [ref=f1e80]:
                    - generic [ref=f1e81]: 
                    - generic [ref=f1e82]: Total de Cadastrados
                  - generic [ref=f1e83]: "297"
                - generic [ref=f1e84]:
                  - button "Publicados 170" [ref=f1e85] [cursor=pointer]:
                    - generic [ref=f1e86]: Publicados
                    - generic [ref=f1e87]: "170"
                  - button "Desativados 22" [ref=f1e88] [cursor=pointer]:
                    - generic [ref=f1e89]: Desativados
                    - generic [ref=f1e90]: "22"
                  - button " Rascunhos (Em Cadastro) 0" [ref=f1e91] [cursor=pointer]:
                    - generic [ref=f1e92]:
                      - generic [ref=f1e93]: 
                      - generic [ref=f1e94]: Rascunhos (Em Cadastro)
                    - generic [ref=f1e95]: "0"
            - generic [ref=f1e96]:
              - button " Filtros " [ref=f1e97] [cursor=pointer]:
                - generic [ref=f1e98]:
                  - generic [ref=f1e99]: 
                  - heading "Filtros" [level=4] [ref=f1e101]
                - generic [ref=f1e102]: 
              - complementary "Filtros de produtos" [ref=f1e104]:
                - generic [ref=f1e105]:
                  - generic [ref=f1e106]: Parâmetros
                  - generic [ref=f1e108]:
                    - generic [ref=f1e109]:
                      - generic [ref=f1e110]: Categoria
                      - combobox "Categoria" [ref=f1e111] [cursor=pointer]:
                        - option "Todas as Categorias" [selected]
                        - option "Somente Produtos"
                        - option "Somente Serviços"
                        - option "Aparadores Buffets"
                        - option "Armários Aéreos"
                        - option "Armários Multiuso"
                        - option "Armários para Fornos"
                        - option "Balcões com Fruteiras"
                        - option "Balcões com Tampo"
                        - option "Balcões para Cooktop"
                        - option "Balcões para Filtro de Àgua"
                        - option "Balcões para Pia"
                        - option "Banheiro"
                        - option "Beliches"
                        - option "Berços"
                        - option "Cabeceiras"
                        - option "Cadeiras para Escritório"
                        - option "Cadeiras para Sala de Jantar"
                        - option "Camas/Bases Box"
                        - option "Colchões"
                        - option "Cômodas"
                        - option "Conjunto para Sala de Jantar"
                        - option "Conjuntos para Banheiro"
                        - option "Cozinha"
                        - option "Cozinhas Moduladas e Compactas"
                        - option "Cristaleiras"
                        - option "Escritório"
                        - option "Espelheira para Banheiro"
                        - option "Estantes"
                        - option "Guarda-Roupas"
                        - option "Homes"
                        - option "Lavanderia"
                        - option "Mesa para Sala de Jantar"
                        - option "Mesas de Cabeceira"
                        - option "Mesas para Escritório"
                        - option "Painéis"
                        - option "Paneleiros"
                        - option "Penteadeiras"
                        - option "Pias"
                        - option "Poltronas"
                        - option "Quarto"
                        - option "Racks"
                        - option "Sala de Estar"
                        - option "Sala de Jantar"
                        - option "Sapateiras"
                        - option "Sofás"
                        - option "Tampos"
                        - option "Treliches"
                    - generic [ref=f1e112]:
                      - generic [ref=f1e113]: Situação no ERP
                      - combobox "Situação no ERP" [ref=f1e114] [cursor=pointer]:
                        - option "Todos os Produtos" [selected]
                        - option "Produtos Ativos"
                        - option "Produtos Desativados"
                        - option "Rascunhos (Em Cadastro)"
                    - generic [ref=f1e115]:
                      - generic [ref=f1e116]: Catálogo Digital
                      - combobox "Catálogo Digital" [ref=f1e117] [cursor=pointer]:
                        - option "Todos" [selected]
                        - option "Publicado no Catálogo"
                        - option "Ocultado do Catálogo"
                - button "Limpar Filtros" [ref=f1e119] [cursor=pointer]:
                  - generic [aria-hidden] [ref=f1e120]: 
                  - text: Limpar Filtros
    - generic [ref=f1e122]:
      - generic:
        - generic:
          - generic: Seu Lizandro
          - generic: Agente IA do ERP
      - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=f1e123] [cursor=pointer]:
        - img "Seu Lizandro - Agente IA" [ref=f1e125]
  - region "Notifications Alt+T"
```

# Test source

```ts
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
> 103 |         await page.getByRole('button', { name: /Nova Composição|\+ Composição/i }).click();
      |                                                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
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