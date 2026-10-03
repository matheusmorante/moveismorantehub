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
Error: Erros críticos de console detectados

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 401 ()",
+ ]
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
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_var_1791056068148 Guarda-Roupa de Casal com Espelho -":
    - button " Variações (1)"
    - text: 000001 ERP Desativado  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_var_1791056068148 Guarda-Roupa de Casal com Espelho" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_var_1791055961467 Poltrona do Papai com Reclinador -":
    - button " Variações (1)"
    - text: 000001 ERP Desativado  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_var_1791055961467 Poltrona do Papai com Reclinador" [level=3]
    - text: "-"
  - button " Variações (1) 004030 Status ERP derivado das variações  Rascunho  Queima dos Salvados Continuar Cadastramento Opções do produto Cozinha Compacta 6 Portas 1 Gaveta com Tampo Dália New Cadorin Cozinhas Moduladas e Compactas •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 004030 ERP Desativado  Rascunho  Queima dos Salvados
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "Cozinha Compacta 6 Portas 1 Gaveta com Tampo Dália New Cadorin" [level=3]
    - text: Cozinhas Moduladas e Compactas •  Multiloja Salvados
  - button " Variações (1) TEST_AUT_db3441d2-246d-48c8-9639-f0bb884a77ad Status ERP derivado das variações Editar Produto Opções do produto Test_aut_db3441d2-246d-48c8-9639-F0bb884a77ad Criado-Mudo de Madeira Hml -":
    - button " Variações (1)"
    - text: TEST_AUT_db3441d2-246d-48c8-9639-f0bb884a77ad ERP Ativo
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Test_aut_db3441d2-246d-48c8-9639-F0bb884a77ad Criado-Mudo de Madeira Hml" [level=3]
    - text: "-"
  - button " Variações (1) TEST_AUT_76df12ca-185e-4080-9338-88444f09fab6 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_76df12ca-185e-4080-9338-88444f09fab6 Criado-Mudo de Madeira Hml -":
    - button " Variações (1)"
    - text: TEST_AUT_76df12ca-185e-4080-9338-88444f09fab6 ERP Ativo
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Test_aut_76df12ca-185e-4080-9338-88444f09fab6 Criado-Mudo de Madeira Hml" [level=3]
    - text: "-"
  - button " Variações (1) TEST_AUT_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Criado-Mudo de Madeira Hml -":
    - button " Variações (1)"
    - text: TEST_AUT_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 ERP Ativo
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Test_aut_5734635f-4e1b-4ef2-8220-2bb2c46a7ba4 Criado-Mudo de Madeira Hml" [level=3]
    - text: "-"
  - button " Variações (1) TEST_AUT_3bbc3842-15ab-4a6b-950b-62917ce614b8 Status ERP derivado das variações Editar Produto Opções do produto Test_aut_3bbc3842-15ab-4a6b-950b-62917ce614b8 Criado-Mudo de Madeira Hml -":
    - button " Variações (1)"
    - text: TEST_AUT_3bbc3842-15ab-4a6b-950b-62917ce614b8 ERP Ativo
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Test_aut_3bbc3842-15ab-4a6b-950b-62917ce614b8 Criado-Mudo de Madeira Hml" [level=3]
    - text: "-"
  - button " Variações (1) CRI-000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [HML FISCAL] Criado-mudo de madeira TEST_AUT_cc21e342-9d76-4b0f-a8ef-27de9031cea7 -":
    - button " Variações (1)"
    - text: CRI-000001 ERP Desativado  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[HML FISCAL] Criado-mudo de madeira TEST_AUT_cc21e342-9d76-4b0f-a8ef-27de9031cea7" [level=3]
    - text: "-"
  - button " Variações (1) 004029 Status ERP derivado das variações  Rascunho  Queima dos Salvados Continuar Cadastramento Opções do produto Sofá 3 Lugares Retrátil Reclinável com USB Veludo 200cm Khalifa Woodx Estofados Sofás •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 004029 ERP Desativado  Rascunho  Queima dos Salvados
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "Sofá 3 Lugares Retrátil Reclinável com USB Veludo 200cm Khalifa Woodx Estofados" [level=3]
    - text: Sofás •  Multiloja Salvados
  - button " Variações (2) 004004 Status ERP derivado das variações Editar Produto Opções do produto Estante Multiuso Open 56cm Estantes | Armários Multiuso •  Movelipe":
    - button " Variações (2)"
    - text: 004004 ERP Ativo
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Estante Multiuso Open 56cm" [level=3]
    - text: Estantes | Armários Multiuso •  Movelipe
  - button " Variações (1) 004002 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sapateira 2 Portas Espelhadas Grife Demóbile Sapateiras | Guarda-Roupas | Armários Multiuso •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 004002 ERP Desativado  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Sapateira 2 Portas Espelhadas Grife Demóbile" [level=3]
    - text: Sapateiras | Guarda-Roupas | Armários Multiuso •  Multiloja Salvados
  - button " Variações (1) 004001 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal Conjunto para Sala de Jantar •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 004001 ERP Desativado  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Conjunto Mesa Itália Granito 1,40m com 6 Cadeiras Metal" [level=3]
    - text: Conjunto para Sala de Jantar •  Multiloja Salvados
  - button " Variações (1) 004000 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar Conjunto para Sala de Jantar •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 004000 ERP Desativado  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Conjunto Mesa Vidro 2,10 M Ester Cimol com 8 Poltronas Grecia para Sala de Jantar" [level=3]
    - text: Conjunto para Sala de Jantar •  Multiloja Salvados
  - button " Variações (1) 003999 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Base Bau Casal 1,38 Damulti Premium Camas/Bases Box •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003999 ERP Desativado  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Base Bau Casal 1,38 Damulti Premium" [level=3]
    - text: Camas/Bases Box •  Multiloja Salvados
  - button " Variações (1) 003998 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta Guarda-Roupas •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003998 ERP Desativado  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta" [level=3]
    - text: Guarda-Roupas •  Multiloja Salvados
  - text: Página 1 · 275 itens no catálogo
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
  - tablist "Canal do resumo":
    - tab "ERP" [selected]
    - tab "Catálogo"
  - button " Total de Cadastrados 297"
  - button "Ativos 142"
  - button "Desativados 155"
  - button " Rascunhos (Em Cadastro) 2"
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

```
Tearing down "context" exceeded the test timeout of 30000ms.
```