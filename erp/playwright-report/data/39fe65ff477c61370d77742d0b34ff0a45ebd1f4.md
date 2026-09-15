# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-draft-flow.spec.ts >> Fluxo de Rascunho de Produto >> Caso 2: Concluir rascunho abre o modal de canais (bug fix de regressão)
- Location: tests\e2e\products\products-draft-flow.spec.ts:211:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="save-result-modal"]').or(getByText('Produto cadastrado com sucesso')).or(getByText('Canal ERP')).first()
Expected: visible
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[data-testid="save-result-modal"]').or(getByText('Produto cadastrado com sucesso')).or(getByText('Canal ERP')).first() with timeout 12000ms
  - waiting for locator('[data-testid="save-result-modal"]').or(getByText('Produto cadastrado com sucesso')).or(getByText('Canal ERP')).first()

```

```yaml
- region "Notifications Alt+T"
- main:
  - text: 
  - textbox "Pesquisar produtos..."
  - button " Novo Produto"
  - button " Mostrar desativados"
  - button " Mostrar fundidos"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789505982670 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789505982670 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789505736951 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789505736951 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 003977 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789505406739 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 003977 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789505406739 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 003976 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789505214674 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 003976 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789505214674 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789505109435 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789505109435 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789504871088 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789504871088 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789504790485 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789504790485 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789504549443 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789504549443 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789504402157 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789504402157 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789503292982 Sofá Draft Conclusão -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789503292982 Sofá Draft Conclusão" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789503217163 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789503217163 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789503217163 Poltrona Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789503217163 Poltrona Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789502435296 Sofá Draft Conclusão -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789502435296 Sofá Draft Conclusão" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789502407896 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789502407896 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789501957624 Sofá Draft Conclusão -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789501957624 Sofá Draft Conclusão" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789501856871 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789501856871 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789501856871 Poltrona Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789501856871 Poltrona Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789500661608 Sofá Draft Conclusão -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789500661608 Sofá Draft Conclusão" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789500590840 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789500590840 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789500557478 Poltrona Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789500557478 Poltrona Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789498160854 Sofá Draft Conclusão -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789498160854 Sofá Draft Conclusão" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789498063921 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789498063921 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789497988601 Poltrona Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789497988601 Poltrona Draft" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789497279392 Sofá Draft Conclusão -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789497279392 Sofá Draft Conclusão" [level=3]
    - text: "-"
  - button " Variações (1) 000001 Status ERP derivado das variações  Rascunho Continuar Cadastramento Opções do produto [teste_aut]_draft_1789497231862 Guarda-Roupa Fênix Draft -":
    - button " Variações (1)"
    - text: 000001 ERP Inativo  Rascunho
    - button "Continuar Cadastramento": 
    - button "Opções do produto": 
    - heading "[teste_aut]_draft_1789497231862 Guarda-Roupa Fênix Draft" [level=3]
    - text: "-"
  - button " Variações (1) 003975 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Casal 6 Portas com Pés Fênix Faimec Guarda-Roupas •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003975 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Guarda Roupa Casal 6 Portas com Pés Fênix Faimec" [level=3]
    - text: Guarda-Roupas •  Multiloja Salvados
  - button " Variações (1) 003974 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Cj 2 Poltrona Madetal Grecia Poltronas •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003974 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Cj 2 Poltrona Madetal Grecia" [level=3]
    - text: Poltronas •  Multiloja Salvados
  - button " Variações (1) 003973 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Armario Aereo Luciane Isis 3pt 120cm Vidro Isi Armários Aéreos •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003973 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Armario Aereo Luciane Isis 3pt 120cm Vidro Isi" [level=3]
    - text: Armários Aéreos •  Multiloja Salvados
  - button " Variações (1) 003972 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Balcao de Pia Luciane Isis 3pt 2gv 120cm S/Tp Isi Balcões para Pia •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003972 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Balcao de Pia Luciane Isis 3pt 2gv 120cm S/Tp Isi" [level=3]
    - text: Balcões para Pia •  Multiloja Salvados
  - button " Variações (1) 003971 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Armario Aereo Luciane Isis 2pt 80cm Isi Armários Aéreos •  Multiloja Salvados":
    - button " Variações (1)"
    - text: 003971 ERP Ativo  Queima dos Salvados
    - button "Editar Produto": 
    - button "Opções do produto": 
    - heading "Armario Aereo Luciane Isis 2pt 80cm Isi" [level=3]
    - text: Armários Aéreos •  Multiloja Salvados
  - text: Página 1 · 247 itens no catálogo
  - combobox:
    - option "10 por página"
    - option "20 por página"
    - option "30 por página" [selected]
    - option "50 por página"
    - option "100 por página"
  - button "" [disabled]
  - button "1" [disabled]
  - button "2"
  - button ""
  - button " Resumo dos Produtos ":
    - text: 
    - heading "Resumo dos Produtos" [level=4]
    - text: 
  - button " Total de Cadastrados 249"
  - button "Publicados 153"
  - button "Desativados 23"
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
- dialog:
  - button "Fechar formulário de produto"
  - heading "Cadastro de Produto" [level=2]
  - text: "ERP: Ativo Catálogo: Ocultado"
  - button "Fechar formulário"
  - tablist "Abas do formulário de produto":
    - tab "Cadastro Geral"
    - tab "Fotos"
    - tab "Informações Técnicas"
    - tab "Estoque e Precificação"
    - tab "Variações" [selected]
    - tab "Tributário / NF"
  - heading "Variações do produto" [level=4]
  - paragraph: Cada variação deve conter pelo menos um atributo com seu valor definido. Para todo atributo adicionado, é obrigatório informar o valor correspondente.
  - heading "Variações (1)" [level=4]
  - button "Adicionar variação" [disabled]
  - table:
    - rowgroup:
      - row "Foto SKU / Código Variação Preço venda (R$) Ações":
        - columnheader "Foto"
        - columnheader "SKU / Código"
        - columnheader "Variação"
        - columnheader "Preço venda (R$)"
        - columnheader "Ações"
    - rowgroup:
      - row "003978-01 Título [teste_aut]_draft_1789506338369 Guarda-Roupa Fênix Draft R$ 499,90 Editar detalhes da variação":
        - cell
        - cell "003978-01"
        - cell "Título [teste_aut]_draft_1789506338369 Guarda-Roupa Fênix Draft":
          - text: Título
          - textbox "VARIAÇÃO GERADA": "[teste_aut]_draft_1789506338369 Guarda-Roupa Fênix Draft"
        - cell "R$ 499,90"
        - cell "Editar detalhes da variação":
          - button "Editar detalhes da variação"
  - button " Salvar rascunho"
  - button "Cancelar"
  - button "Próxima etapa "
- button "Fechar modal"
- dialog "Editar Variação | [teste_aut]_draft_1789506338369 Guarda-Roupa Fênix Draft":
  - heading "Editar Variação | [teste_aut]_draft_1789506338369 Guarda-Roupa Fênix Draft" [level=2]
  - paragraph: Configure os dados específicos desta variação.
  - text: "ERP: Ativo Catálogo: Ocultado"
  - button "Fechar"
  - tablist "Abas da variação":
    - tab "Identificação e Atributos" [selected]
    - tab "Fotos da Variação"
    - tab "Estoque e Precificação"
    - tab "Informações Técnicas"
  - text: Nome *
  - button "Diferenciar Título no Catálogo"
  - textbox "O nome da variação é fixo e gerado automaticamente (Nome do Pai + Valoração dos Atributos)" [disabled]:
    - /placeholder: Nome interno da variação (ERP)...
    - text: "[teste_aut]_draft_1789506338369 Guarda-Roupa Fênix Draft"
  - heading "Atributos da Variação" [level=4]
  - button "Gerenciar Atributos"
  - button "Adicionar"
  - paragraph: Nenhum atributo vinculado.
  - button "Cancelar"
  - button "Concluir"
```

# Test source

```ts
  132 |             const editVarBtn = page.locator('button[aria-label="Editar detalhes da variação"], button[title*="editar detalhes da variação"]').first();
  133 |             if (await editVarBtn.isVisible({ timeout: 5000 })) {
  134 |                 await editVarBtn.click({ force: true });
  135 | 
  136 |                 const varModal = page.locator('[role="dialog"][aria-labelledby="variation-form-modal-title"], [role="dialog"]:has-text("Editar Variação")').first();
  137 |                 await expect(varModal).toBeVisible({ timeout: 8000 });
  138 |                 await page.waitForTimeout(500);
  139 | 
  140 |                 const addAttrBtn = varModal.locator('[data-testid="add-variation-attribute-btn"]').or(varModal.locator('button:has-text("Adicionar")')).first();
  141 |                 await expect(addAttrBtn).toBeVisible({ timeout: 4000 });
  142 |                 await addAttrBtn.click();
  143 |                 await page.waitForTimeout(500);
  144 | 
  145 |                 const attrValInput = varModal.locator('input[placeholder*="Valor"]').first();
  146 |                 await expect(attrValInput).toBeVisible({ timeout: 5000 });
  147 |                 await attrValInput.fill('Preto');
  148 |                 await page.waitForTimeout(300);
  149 | 
  150 |                 // Cadastrar/confirmar valor se houver botão de registro
  151 |                 const regValBtn = varModal.locator('[data-testid="attribute-register-button"]').first();
  152 |                 if (await regValBtn.isVisible({ timeout: 1000 })) {
  153 |                     await regValBtn.click();
  154 |                     await page.waitForTimeout(300);
  155 |                 } else {
  156 |                     await attrValInput.press('Enter');
  157 |                     await page.waitForTimeout(300);
  158 |                 }
  159 | 
  160 |                 const concluirVarBtn = varModal.locator('button:has-text("Concluir")').first();
  161 |                 await expect(concluirVarBtn).toBeVisible({ timeout: 3000 });
  162 |                 await concluirVarBtn.click({ force: true });
  163 |                 await expect(varModal).not.toBeVisible({ timeout: 5000 });
  164 |                 await page.waitForTimeout(400);
  165 |             }
  166 |         }
  167 | 
  168 |         // 4. Aba Tributário / NF (última etapa que habilita o botão de conclusão/cadastro)
  169 |         const fiscalTab = page.locator('button:has-text("Tributário / NF"), button:has-text("Tributário")').first();
  170 |         if (await fiscalTab.isVisible({ timeout: 2000 })) {
  171 |             await fiscalTab.click({ force: true });
  172 |             await page.waitForTimeout(400);
  173 |         }
  174 | 
  175 |         const cadastrarBtn = page.locator('button:has-text("Cadastrar produto"), button:has-text("Cadastrar")').first();
  176 |         await expect(cadastrarBtn).toBeVisible({ timeout: 5000 });
  177 |         await cadastrarBtn.click({ force: true });
  178 |     }
  179 | 
  180 |     // ─────────────────────────────────────────────────────────────────
  181 |     // CASO 1: Salvar Rascunho — produto aparece como rascunho na lista
  182 |     // ─────────────────────────────────────────────────────────────────
  183 |     test('Caso 1: Salvar rascunho — produto fica visível como rascunho na lista', async ({ page }) => {
  184 |         const nomeProduto = `${testRunId} Poltrona Draft`;
  185 |         await abrirFormularioNovoProduto(page, nomeProduto);
  186 | 
  187 |         const saveDraftBtn = page.locator('button:has-text("Salvar rascunho")').first();
  188 |         await expect(saveDraftBtn).toBeEnabled({ timeout: 8000 });
  189 |         await saveDraftBtn.click({ force: true });
  190 |         
  191 |         // Aguarda confirmação visual do salvamento do rascunho
  192 |         await expect(page.locator('text=Rascunho salvo com sucesso')).toBeVisible({ timeout: 10000 });
  193 | 
  194 |         // Fecha o modal pelo botão Cancelar ou Escape
  195 |         const cancelBtn = page.locator('button:has-text("Cancelar"), button:has-text("Fechar")').first();
  196 |         if (await cancelBtn.isVisible({ timeout: 2000 })) {
  197 |             await cancelBtn.click();
  198 |         } else {
  199 |             await page.keyboard.press('Escape');
  200 |         }
  201 |         await page.waitForTimeout(1000);
  202 | 
  203 |         // Verifica na lista de produtos se o item com badge Rascunho está visível
  204 |         const rascunhoBadge = page.locator('text=Rascunho').first();
  205 |         await expect(rascunhoBadge).toBeAttached({ timeout: 8000 });
  206 |     });
  207 | 
  208 |     // ─────────────────────────────────────────────────────────────────
  209 |     // CASO 2: Rascunho concluído → DEVE abrir modal de canais
  210 |     // ─────────────────────────────────────────────────────────────────
  211 |     test('Caso 2: Concluir rascunho abre o modal de canais (bug fix de regressão)', async ({ page }) => {
  212 |         const nomeProduto = `${testRunId} Guarda-Roupa Fênix Draft`;
  213 |         const formModal = await abrirFormularioNovoProduto(page, nomeProduto);
  214 | 
  215 |         // Salva como rascunho primeiro
  216 |         const saveDraftBtn = page.locator('button:has-text("Salvar rascunho")').first();
  217 |         await expect(saveDraftBtn).toBeEnabled({ timeout: 8000 });
  218 |         await saveDraftBtn.click({ force: true });
  219 |         await expect(page.locator('text=Rascunho salvo com sucesso')).toBeVisible({ timeout: 10000 });
  220 |         await page.waitForTimeout(500);
  221 | 
  222 |         // Preenche requisitos e clica em Cadastrar produto
  223 |         await preencherRequisitosECadastrar(page);
  224 | 
  225 |         // VERIFICAÇÃO PRINCIPAL: Modal de canais (saveResult) DEVE aparecer
  226 |         const channelModal = page
  227 |             .locator('[data-testid="save-result-modal"]')
  228 |             .or(page.getByText('Produto cadastrado com sucesso'))
  229 |             .or(page.getByText('Canal ERP'))
  230 |             .first();
  231 | 
> 232 |         await expect(channelModal).toBeVisible({ timeout: 12000 });
      |                                    ^ Error: expect(locator).toBeVisible() failed
  233 |     });
  234 | 
  235 |     // ─────────────────────────────────────────────────────────────────
  236 |     // CASO 3: Produto concluído (ex-rascunho) NÃO fica desativado
  237 |     // ─────────────────────────────────────────────────────────────────
  238 |     test('Caso 3: Produto concluído a partir de rascunho NÃO deve ter badge Rascunho', async ({ page }) => {
  239 |         const nomeProduto = `${testRunId} Sofá Draft Conclusão`;
  240 |         await abrirFormularioNovoProduto(page, nomeProduto);
  241 | 
  242 |         const saveDraftBtn = page.locator('button:has-text("Salvar rascunho")').first();
  243 |         await expect(saveDraftBtn).toBeEnabled({ timeout: 8000 });
  244 |         await saveDraftBtn.click({ force: true });
  245 |         await expect(page.locator('text=Rascunho salvo com sucesso')).toBeVisible({ timeout: 10000 });
  246 |         await page.waitForTimeout(500);
  247 | 
  248 |         await preencherRequisitosECadastrar(page);
  249 | 
  250 |         const channelModal = page
  251 |             .locator('[data-testid="save-result-modal"]')
  252 |             .or(page.getByText('Produto cadastrado com sucesso'))
  253 |             .or(page.getByText('Canal ERP'))
  254 |             .first();
  255 | 
  256 |         if (await channelModal.isVisible({ timeout: 12000 })) {
  257 |             const closeBtn = page.locator(
  258 |                 'button:has-text("Fechar"), button:has-text("Concluir"), button:has-text("Ok")'
  259 |             ).first();
  260 |             if (await closeBtn.isVisible({ timeout: 3000 })) {
  261 |                 await closeBtn.click();
  262 |             }
  263 |         }
  264 | 
  265 |         await page.waitForTimeout(1000);
  266 |         expect(pageErrors).toEqual([]);
  267 |     });
  268 | 
  269 |     // ─────────────────────────────────────────────────────────────────
  270 |     // CASO 4: Formulário de rascunho exibe "Salvar rascunho" (não "Salvar Alterações")
  271 |     // ─────────────────────────────────────────────────────────────────
  272 |     test('Caso 4: Formulário de rascunho exibe botão "Salvar rascunho", não "Salvar Alterações"', async ({ page }) => {
  273 |         await abrirFormularioNovoProduto(page, `${testRunId} Produto Draft Button Check`);
  274 | 
  275 |         // Verifica que o botão de rascunho existe
  276 |         const saveDraftBtn = page.locator('button:has-text("Salvar rascunho")').first();
  277 |         await expect(saveDraftBtn).toBeVisible({ timeout: 5000 });
  278 | 
  279 |         // Verifica que "Salvar Alterações" NÃO está visível (é o botão de produto já cadastrado)
  280 |         const saveAlteracoesBtn = page.locator('button:has-text("Salvar Alterações")').first();
  281 |         const isAlteracoesVisible = await saveAlteracoesBtn.isVisible({ timeout: 1000 }).catch(() => false);
  282 |         expect(isAlteracoesVisible, '"Salvar Alterações" não deve aparecer em novo produto/rascunho').toBe(false);
  283 |     });
  284 | 
  285 |     // ─────────────────────────────────────────────────────────────────
  286 |     // CASO 5: Produto cadastrado (ex-rascunho) pode ser ativado no catálogo
  287 |     //         SEM receber a mensagem "Termine o cadastramento"
  288 |     // ─────────────────────────────────────────────────────────────────
  289 |     test('Caso 5: Produto cadastrado (ex-rascunho) não exibe mensagem de bloqueio de rascunho', async ({ page }) => {
  290 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  291 |         await page.waitForLoadState('domcontentloaded');
  292 | 
  293 |         // Aguarda a lista carregar
  294 |         await page.waitForTimeout(1000);
  295 | 
  296 |         // Verifica que a mensagem de bloqueio de rascunho NÃO aparece visível na tela
  297 |         const rascunhoBlockMsgCatalog = page.locator(
  298 |             'text=Termine o cadastramento para poder publicá-lo no Catálogo'
  299 |         ).first();
  300 |         const rascunhoBlockMsgErp = page.locator(
  301 |             'text=Termine o cadastramento para poder ativá-lo no ERP'
  302 |         ).first();
  303 | 
  304 |         // Essas mensagens só devem aparecer quando o usuário CLICA em ativar um rascunho
  305 |         // Na carga inicial da tela, não devem estar visíveis
  306 |         const isBlockCatalogVisible = await rascunhoBlockMsgCatalog.isVisible({ timeout: 500 }).catch(() => false);
  307 |         const isBlockErpVisible = await rascunhoBlockMsgErp.isVisible({ timeout: 500 }).catch(() => false);
  308 | 
  309 |         expect(isBlockCatalogVisible, 'Mensagem de bloqueio de catálogo não deve estar visível na carga inicial').toBe(false);
  310 |         expect(isBlockErpVisible, 'Mensagem de bloqueio de ERP não deve estar visível na carga inicial').toBe(false);
  311 |     });
  312 | 
  313 |     // ─────────────────────────────────────────────────────────────────
  314 |     // CASO 6: Editar produto JÁ CADASTRADO não reabre modal de canais
  315 |     // ─────────────────────────────────────────────────────────────────
  316 |     test('Caso 6: Editar produto já cadastrado fecha o modal sem reabrir tela de canais', async ({ page }) => {
  317 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  318 |         await page.waitForLoadState('domcontentloaded');
  319 |         await page.waitForTimeout(1000);
  320 | 
  321 |         // Tenta abrir o primeiro produto disponível para edição
  322 |         const firstEditBtn = page.locator('button[title*="Editar"], button[aria-label*="Editar"]').first();
  323 |         const isEditVisible = await firstEditBtn.isVisible({ timeout: 5000 }).catch(() => false);
  324 | 
  325 |         if (!isEditVisible) {
  326 |             test.skip(true, 'Nenhum produto disponível para edição no ambiente de teste');
  327 |             return;
  328 |         }
  329 | 
  330 |         await firstEditBtn.click();
  331 | 
  332 |         const formModal = page.locator('[role="dialog"][aria-labelledby="product-form-title"]').first();
```