# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\categories-deletion-safety.spec.ts >> Suíte Permanente E2E: Ambientes e Categorias >> Cenário 22 — Editar Categoria: remove e adiciona obrigatoriedade sem alterar valores dos Produtos
- Location: tests\e2e\products\categories-deletion-safety.spec.ts:825:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('tab-view-categoria')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: E
        - heading "ERP Móveis Morante" [level=1] [ref=e9]
        - paragraph [ref=e10]: Gestão de Móveis e Serviços
      - generic [ref=e11]:
        - generic [ref=e12]:
          - text: E-mail
          - generic [ref=e13]:
            - generic [ref=e14]: 
            - textbox "exemplo@email.com" [ref=e15]
        - generic [ref=e16]:
          - generic [ref=e17]:
            - generic [ref=e18]: Senha
            - button "Esqueceu?" [ref=e19] [cursor=pointer]
          - generic [ref=e20]:
            - generic [ref=e21]: 
            - textbox "••••••••" [ref=e22]
            - button "" [ref=e23] [cursor=pointer]
        - button "Entrar no Sistema " [ref=e25] [cursor=pointer]:
          - generic [ref=e26]: Entrar no Sistema
          - generic [ref=e27]: 
      - generic [ref=e28]: Ou continuar com
      - button "Entrar com Google" [ref=e33] [cursor=pointer]
      - paragraph [ref=e41]:
        - text: Não tem uma conta?
        - link "Criar conta grátis" [ref=e42] [cursor=pointer]:
          - /url: /signup
    - paragraph [ref=e43]: Sistema de Alta Performance • v2.1
  - region "Notifications Alt+T"
```

# Test source

```ts
  733 | 
  734 |         const nameInput = page.getByPlaceholder(/ex: cozinha/i);
  735 |         await expect(nameInput).toBeVisible();
  736 | 
  737 |         // A seção de atributos NUNCA deve aparecer em modais de Ambiente
  738 |         const attrSection = page.locator('label:has-text("Atributos Obrigatórios")');
  739 |         await expect(attrSection).not.toBeVisible();
  740 |     });
  741 | 
  742 |     // ==========================================
  743 |     // CENÁRIO 20 — Modal de Categoria exibe Atributos Obrigatórios
  744 |     // ==========================================
  745 |     test('Cenário 20 — Modal de Categoria exibe seção de Atributos Obrigatórios com autocomplete', async ({ page }) => {
  746 |         await page.getByTestId('btn-new-category').click();
  747 | 
  748 |         const nameInput = page.getByPlaceholder(/ex: sofá/i);
  749 |         await expect(nameInput).toBeVisible();
  750 | 
  751 |         // A seção de atributos DEVE aparecer em modais de Categoria
  752 |         const attrSection = page.locator('label:has-text("Atributos Obrigatórios")');
  753 |         await expect(attrSection).toBeVisible();
  754 | 
  755 |         // O input de busca de atributos deve estar presente
  756 |         const attrInput = page.getByPlaceholder(/Digite para buscar atributos/i);
  757 |         await expect(attrInput).toBeVisible();
  758 |         await expect(page.getByText('Produtos desta categoria deverão preencher estes atributos.')).toBeVisible();
  759 | 
  760 |         await page.setViewportSize({ width: 375, height: 667 });
  761 |         await expect(page.getByRole('button', { name: /salvar/i })).toBeVisible();
  762 |         const hasHorizontalOverflow = await page.evaluate(() =>
  763 |             document.documentElement.scrollWidth > document.documentElement.clientWidth
  764 |         );
  765 |         expect(hasHorizontalOverflow, 'O modal não deve provocar scroll horizontal no mobile').toBe(false);
  766 |     });
  767 | 
  768 |     // ==========================================
  769 |     // CENÁRIO 21 — Criar Categoria com Atributo Obrigatório e verificar persistência
  770 |     // ==========================================
  771 |     test('Cenário 21 — Criar Categoria com múltiplos Atributos Obrigatórios: sem duplicar por Ambiente e com persistência', async ({ page }) => {
  772 |         await page.getByTestId('btn-new-category').click();
  773 | 
  774 |         const nameInput = page.getByPlaceholder(/ex: sofá/i);
  775 |         await nameInput.fill('ESTANTE COM COR');
  776 | 
  777 |         await page.locator('label').filter({ hasText: 'SALA DE ESTAR' }).locator('input').check();
  778 |         await page.locator('label').filter({ hasText: 'QUARTO CASAL' }).locator('input').check();
  779 | 
  780 |         // Buscar e selecionar o atributo "Cor"
  781 |         const attrInput = page.getByPlaceholder(/Digite para buscar atributos/i);
  782 |         await attrInput.click();
  783 |         await attrInput.fill('Cor');
  784 | 
  785 |         // Aguardar a sugestão aparecer e clicar
  786 |         const corOption = page.getByRole('button', { name: 'Cor' }).first();
  787 |         await expect(corOption).toBeVisible({ timeout: 5000 });
  788 |         await corOption.click();
  789 | 
  790 |         // O atributo selecionado deixa de ser oferecido, impedindo duplicidade.
  791 |         await attrInput.fill('Cor');
  792 |         await expect(page.getByRole('button', { name: 'Cor', exact: true })).not.toBeVisible();
  793 | 
  794 |         await attrInput.fill('Material');
  795 |         await page.getByRole('button', { name: /Material/i }).click();
  796 | 
  797 |         // O chip "Cor" deve aparecer abaixo do autocomplete
  798 |         const chip = page.locator('div').filter({ hasText: /^Cor$/ }).first();
  799 |         await expect(chip).toBeVisible({ timeout: 3000 });
  800 |         await expect(page.locator('div').filter({ hasText: /^Material$/ }).first()).toBeVisible();
  801 | 
  802 |         // Salvar
  803 |         await page.getByRole('button', { name: /salvar/i }).click();
  804 | 
  805 |         // Confirmar que a categoria foi criada (modal fechou)
  806 |         await expect(page.getByPlaceholder(/ex: sofá/i)).not.toBeVisible({ timeout: 5000 });
  807 | 
  808 |         // Verificar que o category_attribute foi persistido no mock
  809 |         const createdCategory = currentCategories.find(category => category.name.toUpperCase() === 'ESTANTE COM COR');
  810 |         expect(createdCategory).toBeDefined();
  811 |         expect(currentCategoryAttributes.filter(ca => ca.category_id === createdCategory?.id)).toHaveLength(2);
  812 |         expect(currentRelationships.filter(rel => rel.child_id === createdCategory?.id)).toHaveLength(2);
  813 | 
  814 |         await page.reload({ waitUntil: 'domcontentloaded' });
  815 |         await page.getByTestId('tab-view-categoria').click();
  816 |         const createdRow = page.locator('tr').filter({ hasText: /ESTANTE COM COR/i });
  817 |         await createdRow.locator('button[aria-label^="Editar categoria"]').click();
  818 |         await expect(page.locator('div').filter({ hasText: /^Cor$/ }).first()).toBeVisible();
  819 |         await expect(page.locator('div').filter({ hasText: /^Material$/ }).first()).toBeVisible();
  820 |     });
  821 | 
  822 |     // ==========================================
  823 |     // CENÁRIO 22 — Editar Categoria e remover Atributo Obrigatório
  824 |     // ==========================================
  825 |     test('Cenário 22 — Editar Categoria: remove e adiciona obrigatoriedade sem alterar valores dos Produtos', async ({ page }) => {
  826 |         // Pre-populate: SOFÁ já tem "Cor" vinculado
  827 |         const sofaId = currentCategories.find((c: any) => c.name.includes('SOFÁ'))?.id;
  828 |         if (sofaId) {
  829 |             currentCategoryAttributes.push({ category_id: sofaId, attribute_id: 'attr-cor', is_required: true });
  830 |         }
  831 | 
  832 |         // Ir para aba categorias e editar o SOFÁ
> 833 |         await page.getByTestId('tab-view-categoria').click();
      |                                                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
  834 |         const sofaRow = page.locator('tr[data-testid^="category-row-cat-sofa"]');
  835 |         const editBtn = sofaRow.locator('button[aria-label^="Editar categoria"]');
  836 |         await editBtn.click();
  837 | 
  838 |         // Modal abre: o atributo "Cor" deve aparecer como chip pré-carregado
  839 |         const chip = page.locator('div').filter({ hasText: /^Cor$/ }).first();
  840 |         await expect(chip).toBeVisible({ timeout: 5000 });
  841 | 
  842 |         // Remover o atributo via botão [x]
  843 |         const removeBtn = page.locator(`button[aria-label="Remover atributo Cor"]`);
  844 |         await expect(removeBtn).toBeVisible();
  845 |         await removeBtn.click();
  846 | 
  847 |         // Chip some
  848 |         await expect(chip).not.toBeVisible({ timeout: 3000 });
  849 | 
  850 |         const attrInput = page.getByPlaceholder(/Digite para buscar atributos/i);
  851 |         await attrInput.fill('Material');
  852 |         await page.getByRole('button', { name: /Material/i }).click();
  853 | 
  854 |         // Salvar
  855 |         await page.getByRole('button', { name: /salvar/i }).click();
  856 | 
  857 |         // Aguardar a persistência terminar e o modal fechar antes de inspecionar o estado do mock.
  858 |         await expect(page.getByPlaceholder(/ex: sofá/i)).not.toBeVisible({ timeout: 5000 });
  859 | 
  860 |         // Confirmar que o vínculo foi removido no mock
  861 |         if (sofaId) {
  862 |             expect(currentCategoryAttributes.filter(ca => ca.category_id === sofaId && ca.attribute_id === 'attr-cor')).toHaveLength(0);
  863 |             expect(currentCategoryAttributes.filter(ca => ca.category_id === sofaId && ca.attribute_id === 'attr-material')).toHaveLength(1);
  864 |         }
  865 |         expect(productVariationMutationCount, 'Alterar obrigatoriedade não pode editar valores das variações').toBe(0);
  866 |     });
  867 | });
  868 | 
```