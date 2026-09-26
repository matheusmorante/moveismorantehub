# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 9: Criação rápida de variação em produto existente sem loop infinito (Maximum update depth exceeded)
- Location: tests\e2e\products\products-variations-e2e.spec.ts:313:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text("Novo Produto")').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('button:has-text("Novo Produto")').first() with timeout 15000ms
  - waiting for locator('button:has-text("Novo Produto")').first()

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
```

# Test source

```ts
  216 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  217 |         await page.waitForLoadState('domcontentloaded');
  218 |         
  219 |         // Clica na linha do Pai Origem para expandir variações
  220 |         await page.locator(`td:has-text("${testRunId} Pai Origem")`).first().click();
  221 | 
  222 |         // Localiza a linha da Variação do Pai Origem e abre o menu de ações
  223 |         const trVariação = page.locator(`tr:has-text("Variação 1"):near(:text("${testRunId} Pai Origem"))`).first();
  224 |         await trVariação.locator('button[title="Mais ações"]').first().click();
  225 |         
  226 |         // Clica em "Mesclar com outra variação"
  227 |         await page.locator('button:has-text("Mesclar com outra variação")').first().click();
  228 | 
  229 |         // Modal de fusão deve estar visível
  230 |         const mergeModal = page.locator('div[role="dialog"][aria-labelledby="merge-variation-title"]').first();
  231 |         await expect(mergeModal).toBeVisible();
  232 | 
  233 |         // Digita o nome do Pai Destino para buscar a variação canônica
  234 |         const searchInput = mergeModal.locator('input[placeholder*="Pesquise por nome"]').first();
  235 |         await searchInput.fill(`${testRunId} Pai Destino`);
  236 | 
  237 |         // Seleciona a opção encontrada
  238 |         const option = mergeModal.locator('button:has-text("Pai Destino")').first();
  239 |         await expect(option).toBeVisible({ timeout: 5000 });
  240 |         await option.click();
  241 | 
  242 |         // Confirma a fusão
  243 |         const confirmBtn = mergeModal.locator('button:has-text("Confirmar fusão")').first();
  244 |         await confirmBtn.click();
  245 | 
  246 |         const successToast = page.locator('text=Variação mesclada');
  247 |         await expect(successToast).toBeVisible({ timeout: 5000 });
  248 |         await expect(mergeModal).toBeHidden({ timeout: 5000 });
  249 |     });
  250 | 
  251 |     test('Caso 8: Mover variação com fotos explícitas e herdadas', async ({ page }) => {
  252 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  253 |         await page.waitForLoadState('domcontentloaded');
  254 | 
  255 |         // Note: For a real test, we would upload an image, but Playwright might skip the complex upload UI.
  256 |         // We will just verify that the modal for moving variations can be opened and submitted without crashing
  257 |         // and that it preserves the variation's photos if we stub or mock the API.
  258 |         
  259 |         // Cria o Produto Pai A (Origem)
  260 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  261 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  262 |         await newProductBtn.click();
  263 |         const nameInputA = page.locator('input[placeholder*="nome interno"]').first();
  264 |         await nameInputA.fill(`${testRunId} Pai Origem Mov`);
  265 |         await nameInputA.blur();
  266 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  267 |             await page.locator('button:has-text("Próxima etapa")').click();
  268 |         }
  269 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  270 |             await page.locator('button:has-text("Próxima etapa")').click();
  271 |         }
  272 |         await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
  273 |         await expect(page.locator('text=com sucesso').first()).toBeVisible({ timeout: 15000 });
  274 | 
  275 |         // Cria o Produto Pai B (Destino)
  276 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  277 |         await page.waitForLoadState('domcontentloaded');
  278 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  279 |         await newProductBtn.click();
  280 |         const nameInputB = page.locator('input[placeholder*="nome interno"]').first();
  281 |         await nameInputB.fill(`${testRunId} Pai Destino Mov`);
  282 |         await nameInputB.blur();
  283 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  284 |             await page.locator('button:has-text("Próxima etapa")').click();
  285 |         }
  286 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  287 |             await page.locator('button:has-text("Próxima etapa")').click();
  288 |         }
  289 |         await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
  290 |         await expect(page.locator('text=com sucesso').first()).toBeVisible({ timeout: 15000 });
  291 | 
  292 |         // Acessa a lista
  293 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  294 |         await page.waitForLoadState('domcontentloaded');
  295 | 
  296 |         // Clica na linha do Pai Origem Mov
  297 |         await page.locator(`td:has-text("${testRunId} Pai Origem Mov")`).first().click();
  298 | 
  299 |         // Clica na linha da Variação do Pai Origem e abre o menu de ações
  300 |         const trVariação = page.locator(`tr:has-text("Variação 1"):near(:text("${testRunId} Pai Origem Mov"))`).first();
  301 |         const moreActions = trVariação.locator('button[title="Mais opções do produto"], button[aria-label="Mais opções da variação"]').first();
  302 |         await moreActions.click();
  303 |         
  304 |         // Clica em "Mover para outro produto pai"
  305 |         const moveBtn = page.locator('button:has-text("Mover para outro produto pai")').first();
  306 |         
  307 |         // Trata a obrigatoriedade do Fornecedor antes de Mover
  308 |         // Na prática, se o produto estiver sem fornecedor, vai exibir um Toast de erro.
  309 |         // Como Mover exige fornecedor, vamos apenas validar se o botão existe no DOM ou se exibe a restrição corretamente.
  310 |         expect(await moveBtn.isVisible()).toBe(true);
  311 |     });
  312 | 
  313 |     test('Caso 9: Criação rápida de variação em produto existente sem loop infinito (Maximum update depth exceeded)', async ({ page }) => {
  314 |         // Cria o Produto Pai
  315 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
> 316 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
      |                                     ^ Error: expect(locator).toBeVisible() failed
  317 |         await newProductBtn.click();
  318 |         
  319 |         const nameInputA = page.locator('input[placeholder*="nome interno"]').first();
  320 |         await nameInputA.fill(`${testRunId} Pai Sem Loop`);
  321 |         await nameInputA.blur();
  322 | 
  323 |         // Aba Estoque para colocar preço no pai e habilitar herança rápida
  324 |         await page.locator('button:has-text("Estoque")').first().click();
  325 |         const priceInput = page.locator('input[placeholder="0,00"]').first();
  326 |         await priceInput.fill('100,00');
  327 | 
  328 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  329 |             await page.locator('button:has-text("Próxima etapa")').click();
  330 |         }
  331 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  332 |             await page.locator('button:has-text("Próxima etapa")').click();
  333 |         }
  334 |         await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
  335 |         await expect(page.locator('text=com sucesso').first()).toBeVisible({ timeout: 15000 });
  336 | 
  337 |         // Volta para a lista e abre o produto recém-criado
  338 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  339 |         await page.waitForLoadState('domcontentloaded');
  340 | 
  341 |         // Abre modal do produto existente (clica no botão de edição ou na linha)
  342 |         await page.locator(`td:has-text("${testRunId} Pai Sem Loop")`).first().click();
  343 |         const editBtn = page.locator(`tr:has-text("${testRunId} Pai Sem Loop") button[title="Editar produto"]`).first();
  344 |         if (await editBtn.isVisible()) {
  345 |             await editBtn.click();
  346 |         }
  347 | 
  348 |         // Modal de produto deve estar visível
  349 |         const parentModal = page.locator('.fixed.inset-0 .relative.bg-white, .fixed.inset-0 .relative.dark\\:bg-slate-900').first();
  350 |         await expect(parentModal).toBeVisible({ timeout: 5000 });
  351 | 
  352 |         // Navega para aba variações
  353 |         await page.locator('button:has-text("Variações")').first().click();
  354 | 
  355 |         // Clica em "Adicionar variação" rapidamente
  356 |         const addVarBtn = page.locator('button:has-text("Adicionar variação")').first();
  357 |         await addVarBtn.click();
  358 | 
  359 |         // Modal de variação abre
  360 |         const varModal = page.locator('div[role="dialog"][aria-labelledby="variation-form-modal-title"]').first();
  361 |         await expect(varModal).toBeVisible({ timeout: 5000 });
  362 | 
  363 |         // Adiciona um atributo qualquer e salva a variação
  364 |         const addAttrBtn = varModal.locator('button:has-text("Adicionar Atributo")').first();
  365 |         if (await addAttrBtn.isVisible()) {
  366 |             await addAttrBtn.click();
  367 |         }
  368 | 
  369 |         const valueInput = varModal.locator('input[placeholder="Ex: P, Vermelho, 110V"]').first();
  370 |         if (await valueInput.isVisible()) {
  371 |             await valueInput.fill('Novo Atributo');
  372 |             await valueInput.press('Enter');
  373 |         }
  374 | 
  375 |         // Concluir variação
  376 |         await varModal.locator('button:has-text("Concluir")').first().click();
  377 | 
  378 |         // Verifica que o modal da variação fechou
  379 |         await expect(varModal).toBeHidden({ timeout: 5000 });
  380 | 
  381 |         // Se houver loop infinito, o Playwright vai travar ou capturar erro de console "Maximum update depth exceeded"
  382 |         // O afterEach garante que pageErrors e consoleErrors estejam vazios.
  383 |         
  384 |         // Conclui o produto
  385 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  386 |             await page.locator('button:has-text("Próxima etapa")').click();
  387 |         }
  388 |         await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
  389 |         await expect(page.locator('text=com sucesso').first()).toBeVisible({ timeout: 15000 });
  390 |         
  391 |         const successToast = page.locator('text=Produto salvo com sucesso');
  392 |         await expect(successToast).toBeVisible({ timeout: 5000 });
  393 |     });
  394 | });
  395 | 
  396 | 
```