# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1
- Location: tests\e2e\products\products-variations-e2e.spec.ts:87:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Antes de criar outra variação, informe pelo menos um atributo')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=Antes de criar outra variação, informe pelo menos um atributo') with timeout 5000ms
  - waiting for locator('text=Antes de criar outra variação, informe pelo menos um atributo')

```

```yaml
- region "Notifications Alt+T"
- main:
  - text: 
  - textbox "Pesquisar produtos..."
  - button ""
  - button " Mostrar desativados"
  - button " Variações (2) 004004 Status ERP derivado das variações Editar Produto Opções do produto Estante Multiuso Open 56cm Estantes | Armários Multiuso •  Movelipe":
    - button " Variações (2)"
    - text: 004004 ERP Ativo
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Estante Multiuso Open 56cm" [level=3]
    - text: Estantes | Armários Multiuso •  Movelipe
  - button " Variações (1) 004002 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sapateira 2 Portas Espelhadas Grife Demóbile Sapateiras | Guarda-Roupas | Armários Multiuso •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 004002 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Sapateira 2 Portas Espelhadas Grife Demóbile" [level=3]
    - text: Sapateiras | Guarda-Roupas | Armários Multiuso •  Multiloja Salvados
  - button " Variações (1) 004001 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal Conjunto para Sala de Jantar •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 004001 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal" [level=3]
    - text: Conjunto para Sala de Jantar •  Multiloja Salvados
  - button " Variações (1) 004000 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar Conjunto para Sala de Jantar •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 004000 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar" [level=3]
    - text: Conjunto para Sala de Jantar •  Multiloja Salvados
  - button " Variações (1) 003999 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Base Bau Casal 1,38 Damulti Premium Camas/Bases Box •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003999 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Base Bau Casal 1,38 Damulti Premium" [level=3]
    - text: Camas/Bases Box •  Multiloja Salvados
  - button " Variações (1) 003998 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta Guarda-Roupas •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003998 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta" [level=3]
    - text: Guarda-Roupas •  Multiloja Salvados
  - button " Variações (1) 003997 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Colchão Queen 158 Castor Sleep Max D45 Colchões •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003997 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Colchão Queen 158 Castor Sleep Max D45" [level=3]
    - text: Colchões •  Multiloja Salvados
  - button " Variações (1) 003996 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto para Sala de Jantar Madetal Moscou 1,54 M 6 Cadeiras Grecia Conjunto para Sala de Jantar •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003996 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Conjunto para Sala de Jantar Madetal Moscou 1,54 M 6 Cadeiras Grecia" [level=3]
    - text: Conjunto para Sala de Jantar •  Multiloja Salvados
  - button " Variações (1) 003995 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sofá Woodx Jaffar 3 Lugares 2,00 M Sofás •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003995 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Sofá Woodx Jaffar 3 Lugares 2,00 M" [level=3]
    - text: Sofás •  Multiloja Salvados
  - button " Variações (1) 003994 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Atualle Sao Paulo 6pt 3gv Friso Reflec Guarda-Roupas •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003994 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Guarda Roupa Atualle Sao Paulo 6pt 3gv Friso Reflec" [level=3]
    - text: Guarda-Roupas •  Multiloja Salvados
  - button " Variações (1) 003993 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Faimec Portugal 2 Portas Guarda-Roupas •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003993 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Guarda Roupa Faimec Portugal 2 Portas" [level=3]
    - text: Guarda-Roupas •  Multiloja Salvados
  - button " Variações (1) 003992 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Paneleiro Telasul Star New 4pt 80cm Paneleiros •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003992 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Paneleiro Telasul Star New 4pt 80cm" [level=3]
    - text: Paneleiros •  Multiloja Salvados
  - button " Variações (1) 003991 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Cabeceira Jsw Amanda 1,58 M Cabeceiras •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003991 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Cabeceira Jsw Amanda 1,58 M" [level=3]
    - text: Cabeceiras •  Multiloja Salvados
  - button " Variações (1) 003990 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sofá Woodx Khalifa 4lug 2,50 M Veludo Sofás •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003990 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Sofá Woodx Khalifa 4lug 2,50 M Veludo" [level=3]
    - text: Sofás •  Multiloja Salvados
  - button " Variações (1) 003989 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Paneleiro Telasul Lumina 2pt 50cm Paneleiros •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003989 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Paneleiro Telasul Lumina 2pt 50cm" [level=3]
    - text: Paneleiros •  Multiloja Salvados
  - text: Página 1 · 150 itens no catálogo
  - combobox:
    - option "10 por página"
    - option "15 por página" [selected]
  - button "" [disabled]
  - button "1" [disabled]
  - button "2"
  - button ""
  - button " Resumo dos Produtos ":
    - text: 
    - heading "Resumo dos Produtos" [level=4]
    - text: 
  - button " Total de Cadastrados 297"
  - button "Publicados 170"
  - button "Desativados 22"
  - button " Rascunhos (Em Cadastro) 0"
  - button " Filtros ":
    - text: 
    - heading "Filtros" [level=4]
    - text: 
  - complementary "Filtros de produtos":
    - text: Parâmetros Categoria
    - combobox "Categoria":
      - option "Todas as Categorias" [selected]
    - text: Situação no ERP
    - combobox "Situação no ERP":
      - option "Todos os Produtos" [selected]
      - option "Produtos Ativos"
      - option "Produtos Desativados"
      - option "Rascunhos (Em Cadastro)"
    - text: Catálogo Digital
    - combobox "Catálogo Digital":
      - option "Todos" [selected]
      - option "Publicado no Catálogo"
      - option "Ocultado do Catálogo"
    - button "Limpar Filtros"
- text: Seu Lizandro Agente IA do ERP
- button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP":
  - img "Seu Lizandro - Agente IA"
- region "Notifications Alt+T"
- dialog:
  - button "Fechar formulário de produto"
  - heading "Cadastro de Produto" [level=2]
  - text: "ERP: Pendente Catálogo: Ocultado"
  - button "Fechar formulário"
  - tablist "Abas do formulário de produto":
    - tab "Cadastro Geral" [selected]
    - tab "Fotos"
    - tab "Características" [disabled]
    - tab "Descrição" [disabled]
    - tab "Estoque e Precificação"
    - tab "Variações"
    - tab "Tributário / NF"
  - text: Nome *
  - button "Diferenciar Título no Catálogo"
  - 'textbox "Digite o nome interno do produto (ex: SOFA 3 LUG)..."'
  - text: Categoria(s) *
  - button "Gerenciar Categorias de Produtos": GERENCIAR 
  - text: 
  - textbox "Pesquisar categorias":
    - /placeholder: Pesquisar categorias...
  - text: Oportunidade
  - combobox:
    - option "Nenhuma (Produto Normal)" [selected]
    - option "Mega Liquidação"
    - option "Queima dos Salvados"
    - option "Última Unidade - Mostruário"
  - text: Observações Internas
  - textbox "Digite notas internas sobre este produto, processos ou detalhes específicos..."
  - button " Salvar rascunho" [disabled]
  - button "Cancelar"
  - button "Próxima etapa "
```

```
Error: Erros críticos de console detectados

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 400 ()",
+ ]
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | 
  3   | test.describe('Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio', () => {
  4   |     const testRunId = `[TESTE_AUT]_VAR_${Date.now()}`;
  5   |     const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  6   |     let consoleErrors: string[] = [];
  7   |     let pageErrors: string[] = [];
  8   | 
  9   |     async function openNewProduct(page: Page) {
  10  |         const optionsButton = page.locator('button[title="Opções"]').first();
  11  |         await expect(optionsButton).toBeVisible({ timeout: 15000 });
  12  |         await optionsButton.click();
  13  |         const newProductButton = page.getByRole('button', { name: 'Novo Produto' }).first();
  14  |         await expect(newProductButton).toBeVisible({ timeout: 5000 });
  15  |         await newProductButton.click();
  16  |     }
  17  | 
  18  |     test.beforeEach(async ({ page }) => {
  19  |         consoleErrors = [];
  20  |         pageErrors = [];
  21  | 
  22  |         page.on('console', msg => {
  23  |             if (msg.type() === 'error') {
  24  |                 consoleErrors.push(msg.text());
  25  |             }
  26  |         });
  27  | 
  28  |         page.on('pageerror', err => {
  29  |             pageErrors.push(err.message);
  30  |         });
  31  | 
  32  |         await page.goto(`/products?${AUTH_QUERY}`);
  33  |         await page.waitForLoadState('domcontentloaded');
  34  |     });
  35  | 
  36  |     test.afterEach(async ({ page }) => {
  37  |         const realErrors = consoleErrors.filter(e => 
  38  |             !e.includes('favicon') && 
  39  |             !e.includes('Download the React DevTools') &&
  40  |             !e.includes('net::ERR_CONNECTION_REFUSED') && !e.includes('404') && !e.includes('Not Found')
  41  |         );
> 42  |         expect(realErrors, 'Erros críticos de console detectados').toEqual([]);
      |                                                                    ^ Error: Erros críticos de console detectados
  43  |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  44  | 
  45  |         // Teardown seguro de dados criados com testRunId
  46  |         await page.evaluate((runId) => {
  47  |             const raw = localStorage.getItem('erp_products');
  48  |             if (raw) {
  49  |                 try {
  50  |                     const products = JSON.parse(raw);
  51  |                     const filtered = products.filter((p: any) => !p.name?.includes(runId) && !p.id?.includes(runId));
  52  |                     localStorage.setItem('erp_products', JSON.stringify(filtered));
  53  |                 } catch (e) {
  54  |                     console.error(e);
  55  |                 }
  56  |             }
  57  |         }, testRunId);
  58  |     });
  59  | 
  60  |     test('Caso 1: Criação de produto simples e geração automática da Variação 1 padrão', async ({ page }) => {
  61  |         await openNewProduct(page);
  62  | 
  63  |         // Modal de produto deve estar visível
  64  |         const parentModal = page.locator('.fixed.inset-0 .relative.bg-white, .fixed.inset-0 .relative.dark\\:bg-slate-900').first();
  65  |         await expect(parentModal).toBeVisible({ timeout: 5000 });
  66  | 
  67  |         // Preenche o nome na aba Geral
  68  |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  69  |         await expect(nameInput).toBeVisible();
  70  |         await nameInput.fill(`${testRunId} poltrona do papai com reclinador`);
  71  |         await nameInput.blur();
  72  | 
  73  |         // Verifica formatação automática em Title Case com conectivos 'do' e 'com' em minúsculo
  74  |         const formattedValue = await nameInput.inputValue();
  75  |         expect(formattedValue).toContain('Poltrona do Papai com Reclinador');
  76  | 
  77  |         // Navega para a aba de variações
  78  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  79  |         await variationsTabBtn.click();
  80  | 
  81  |         // Deve existir a Variação 1 gerada automaticamente na lista
  82  |         const tableRows = page.locator('div[role="dialog"] table tbody tr');
  83  |         console.log(await page.evaluate(() => document.body.innerHTML.substring(0, 3000)));
  84  |         await expect(tableRows).toHaveCount(1);
  85  |     });
  86  | 
  87  |     test('Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1', async ({ page }) => {
  88  |         await openNewProduct(page);
  89  | 
  90  |         // Navega para a aba de variações
  91  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  92  |         await variationsTabBtn.click();
  93  | 
  94  |         // Botão "Adicionar variação" deve estar desabilitado ou barrar a criação com aviso
  95  |         const addVarBtn = page.locator('button:has-text("Adicionar variação")').first();
  96  |         const isDisabled = await addVarBtn.isDisabled();
  97  | 
  98  |         if (isDisabled) {
  99  |             expect(isDisabled).toBe(true);
  100 |         } else {
  101 |             await addVarBtn.click();
  102 |             // Deve exibir toast de bloqueio informando necessidade de atributo na Variação 1
  103 |             const toastMessage = page.locator('text=Antes de criar outra variação, informe pelo menos um atributo');
  104 |             await expect(toastMessage).toBeVisible({ timeout: 5000 });
  105 |         }
  106 |     });
  107 | 
  108 |     test('Caso 3: Adição de Variação Manual com Atributos e Validação do Tamanho do Modal', async ({ page }) => {
  109 |         await openNewProduct(page);
  110 | 
  111 |         // Preenche nome do pai
  112 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  113 |         await nameInput.fill(`${testRunId} Guarda-Roupa de Casal com Espelho`);
  114 |         await nameInput.blur();
  115 | 
  116 |         // Aba de Variações
  117 |         await page.locator('button:has-text("Variações")').first().click();
  118 | 
  119 |         // Clica na Variação 1 para editar
  120 |         const firstVarRow = page.locator('div[role="dialog"] table tbody tr').first();
  121 |         await firstVarRow.click();
  122 | 
  123 |         // Modal de Variação deve estar aberto
  124 |         const varModal = page.locator('div[role="dialog"][aria-labelledby="variation-form-modal-title"]').first();
  125 |         await expect(varModal).toBeVisible({ timeout: 5000 });
  126 | 
  127 |         // Validação estrita do tamanho do Modal de Variação (mesmo tamanho do modal pai: max-w-5xl h-[92vh] rounded-3xl)
  128 |         const modalClass = await varModal.getAttribute('class');
  129 |         expect(modalClass).toContain('max-w-5xl');
  130 |         expect(modalClass).toContain('h-[92vh]');
  131 |         expect(modalClass).toContain('rounded-3xl');
  132 | 
  133 |         // Fecha/Conclui o modal da Variação 1
  134 |         const cancelOrCloseBtn = page.locator('button:has-text("Cancelar"), button:has-text("Concluir")').first();
  135 |         await cancelOrCloseBtn.click();
  136 |     });
  137 | 
  138 |     test('Caso 4: Regra de Imutabilidade da Variação 1', async ({ page }) => {
  139 |         await openNewProduct(page);
  140 | 
  141 |         await page.locator('button:has-text("Variações")').first().click();
  142 | 
```