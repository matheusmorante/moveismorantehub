# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\categories-deletion-safety.spec.ts >> Suíte Permanente E2E: Ambientes e Categorias >> Cenário 15 — Accordion dos Ambientes: recolher e expandir sem alterar vínculos
- Location: tests\e2e\products\categories-deletion-safety.spec.ts:661:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('div[data-testid^="environment-row-env-sala"]').locator('text=SOFÁ COM PRODUTOS')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('div[data-testid^="environment-row-env-sala"]').locator('text=SOFÁ COM PRODUTOS') with timeout 5000ms
  - waiting for locator('div[data-testid^="environment-row-env-sala"]').locator('text=SOFÁ COM PRODUTOS')

```

```yaml
- text: E
- heading "ERP Móveis Morante" [level=1]
- paragraph: Gestão de Móveis e Serviços
- text: E-mail 
- textbox "exemplo@email.com"
- text: Senha
- button "Esqueceu?"
- text: 
- textbox "••••••••"
- button ""
- button "Entrar no Sistema "
- text: Ou continuar com
- button "Entrar com Google":
  - img
  - text: Entrar com Google
- paragraph:
  - text: Não tem uma conta?
  - link "Criar conta grátis":
    - /url: /signup
- paragraph: Sistema de Alta Performance • v2.1
- region "Notifications Alt+T"
```

# Test source

```ts
  565 | 
  566 |         const deleteBtn = isoladaRow.locator('button[aria-label*="Excluir categoria"]');
  567 |         await expect(deleteBtn).toBeEnabled();
  568 |         await deleteBtn.click();
  569 | 
  570 |         await expect(isoladaRow).not.toBeVisible();
  571 |     });
  572 | 
  573 |     // ==========================================
  574 |     // CENÁRIO 11 — Busca contextual
  575 |     // ==========================================
  576 |     test('Cenário 11 — Busca contextual independente por aba', async ({ page }) => {
  577 |         const searchInput = page.getByPlaceholder(/buscar ambiente\.\.\./i);
  578 |         await searchInput.fill('QUARTO');
  579 | 
  580 |         await expect(page.locator('text=QUARTO CASAL')).toBeVisible();
  581 |         await expect(page.locator('text=SALA DE ESTAR')).not.toBeVisible();
  582 | 
  583 |         await searchInput.fill('');
  584 |         await expect(page.locator('text=SALA DE ESTAR')).toBeVisible();
  585 | 
  586 |         // Muda para Categorias
  587 |         await page.getByTestId('tab-view-categoria').click();
  588 |         const catSearchInput = page.getByPlaceholder(/buscar categoria\.\.\./i);
  589 |         await catSearchInput.fill('PUFE');
  590 | 
  591 |         await expect(page.locator('table').getByText('PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();
  592 |         await expect(page.locator('table').getByText('SOFÁ COM PRODUTOS')).not.toBeVisible();
  593 |     });
  594 | 
  595 |     // ==========================================
  596 |     // CENÁRIO 12 — Filtros de Categoria
  597 |     // ==========================================
  598 |     test('Cenário 12 — Filtros de Categoria (Todas, Com ambiente, Sem ambiente)', async ({ page }) => {
  599 |         await page.getByTestId('tab-view-categoria').click();
  600 | 
  601 |         // Filtro: Sem ambiente (apenas CATEGORIA TOTALMENTE LIVRE)
  602 |         await page.getByRole('button', { name: /sem ambiente/i }).click();
  603 |         await expect(page.locator('table').getByText('CATEGORIA TOTALMENTE LIVRE')).toBeVisible();
  604 |         await expect(page.locator('table').getByText('SOFÁ COM PRODUTOS')).not.toBeVisible();
  605 | 
  606 |         // Filtro: Com ambiente
  607 |         await page.getByRole('button', { name: /com ambiente/i }).click();
  608 |         await expect(page.locator('table').getByText('SOFÁ COM PRODUTOS')).toBeVisible();
  609 |         await expect(page.locator('table').getByText('CATEGORIA TOTALMENTE LIVRE')).not.toBeVisible();
  610 | 
  611 |         // Filtro: Todas
  612 |         await page.getByRole('button', { name: /todas \(/i }).click();
  613 |         await expect(page.locator('table').getByText('SOFÁ COM PRODUTOS')).toBeVisible();
  614 |         await expect(page.locator('table').getByText('CATEGORIA TOTALMENTE LIVRE')).toBeVisible();
  615 |     });
  616 | 
  617 |     // ==========================================
  618 |     // CENÁRIO 13 — Editar Ambiente
  619 |     // ==========================================
  620 |     test('Cenário 13 — Editar Ambiente: nome, categorias vinculadas e persistência', async ({ page }) => {
  621 |         const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
  622 |         await salaRow.locator('button[aria-label*="Editar ambiente"]').click();
  623 | 
  624 |         const input = page.getByPlaceholder(/ex: cozinha/i);
  625 |         await expect(input).toBeVisible();
  626 |         await input.fill('SALA PRINCIPAL DECORADA');
  627 | 
  628 |         await page.getByRole('button', { name: /salvar/i }).click();
  629 | 
  630 |         await expect(page.locator('text=SALA PRINCIPAL DECORADA')).toBeVisible({ timeout: 5000 });
  631 | 
  632 |         await page.reload({ waitUntil: 'domcontentloaded' });
  633 |         await expect(page.locator('text=SALA PRINCIPAL DECORADA')).toBeVisible({ timeout: 5000 });
  634 |     });
  635 | 
  636 |     // ==========================================
  637 |     // CENÁRIO 14 — Editar Categoria
  638 |     // ==========================================
  639 |     test('Cenário 14 — Editar Categoria: nome, ambientes vinculados e persistência', async ({ page }) => {
  640 |         await page.getByTestId('tab-view-categoria').click();
  641 | 
  642 |         const sofaRow = page.locator('tr[data-testid^="category-row-cat-sofa"]');
  643 |         await sofaRow.locator('button[aria-label*="Editar categoria"]').click();
  644 | 
  645 |         const input = page.getByPlaceholder(/ex: sofá/i);
  646 |         await expect(input).toBeVisible();
  647 |         await input.fill('SOFÁ RETRÁTIL E RECLINÁVEL');
  648 | 
  649 |         await page.getByRole('button', { name: /salvar/i }).click();
  650 | 
  651 |         await expect(page.locator('table').getByText('SOFÁ RETRÁTIL E RECLINÁVEL')).toBeVisible({ timeout: 5000 });
  652 | 
  653 |         await page.reload({ waitUntil: 'domcontentloaded' });
  654 |         await page.getByTestId('tab-view-categoria').click();
  655 |         await expect(page.locator('table').getByText('SOFÁ RETRÁTIL E RECLINÁVEL')).toBeVisible({ timeout: 5000 });
  656 |     });
  657 | 
  658 |     // ==========================================
  659 |     // CENÁRIO 15 — Accordion dos Ambientes
  660 |     // ==========================================
  661 |     test('Cenário 15 — Accordion dos Ambientes: recolher e expandir sem alterar vínculos', async ({ page }) => {
  662 |         const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
  663 |         const collapseBtn = salaRow.locator('button[title="Recolher ambiente"]');
  664 | 
> 665 |         await expect(salaRow.locator('text=SOFÁ COM PRODUTOS')).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  666 | 
  667 |         // Recolher
  668 |         await collapseBtn.click();
  669 |         await expect(salaRow.locator('text=SOFÁ COM PRODUTOS')).not.toBeVisible();
  670 | 
  671 |         // Expandir novamente
  672 |         const expandBtn = salaRow.locator('button[title="Expandir ambiente"]');
  673 |         await expandBtn.click();
  674 |         await expect(salaRow.locator('text=SOFÁ COM PRODUTOS')).toBeVisible();
  675 |     });
  676 | 
  677 |     // ==========================================
  678 |     // CENÁRIO 16 — Indicador "+N" de Ambientes
  679 |     // ==========================================
  680 |     test('Cenário 16 — Indicador "+N" de Ambientes exibe badge resumido com tooltip', async ({ page }) => {
  681 |         await page.getByTestId('tab-view-categoria').click();
  682 | 
  683 |         const multiRow = page.locator('tr[data-testid^="category-row-cat-multi-env"]');
  684 |         await expect(multiRow).toBeVisible();
  685 | 
  686 |         // Cadeira Multi está em 4 ambientes -> deve exibir os 3 primeiros e um badge "+1"
  687 |         const plusBadge = multiRow.locator('span:has-text("+1")');
  688 |         await expect(plusBadge).toBeVisible();
  689 |         await expect(plusBadge).toHaveAttribute('title', /JARDIM/);
  690 |     });
  691 | 
  692 |     // ==========================================
  693 |     // CENÁRIO 17 — Responsividade
  694 |     // ==========================================
  695 |     test('Cenário 17 — Responsividade em Desktop, Tablet e Mobile (cards sem scroll horizontal)', async ({ page }) => {
  696 |         // Desktop
  697 |         await page.setViewportSize({ width: 1280, height: 800 });
  698 |         await expect(page.locator('h1:has-text("Ambientes e Categorias")')).toBeVisible();
  699 | 
  700 |         // Tablet
  701 |         await page.setViewportSize({ width: 768, height: 1024 });
  702 |         await expect(page.locator('h1:has-text("Ambientes e Categorias")')).toBeVisible();
  703 | 
  704 |         // Mobile
  705 |         await page.setViewportSize({ width: 375, height: 667 });
  706 |         await expect(page.locator('h1:has-text("Ambientes e Categorias")')).toBeVisible();
  707 | 
  708 |         // Na aba Categorias em Mobile, deve exibir cards em vez de tabela oculta
  709 |         await page.getByTestId('tab-view-categoria').click();
  710 |         const mobileCard = page.locator('div.flex.md\\:hidden').first();
  711 |         await expect(mobileCard).toBeVisible();
  712 |     });
  713 | 
  714 |     // ==========================================
  715 |     // CENÁRIO 18 — Console e erros de rede
  716 |     // ==========================================
  717 |     test('Cenário 18 — Fluxo completo sem erros críticos no console ou loops de requisição', async ({ page }) => {
  718 |         // Navega entre as duas visões
  719 |         await page.getByTestId('tab-view-categoria').click();
  720 |         const requestsAfterInitialLoad = restRequestCount;
  721 |         await page.getByTestId('tab-view-ambiente').click();
  722 | 
  723 |         // Verificação final garantida pelo afterEach
  724 |         expect(restRequestCount, 'Alternar abas não deve disparar novas consultas REST').toBe(requestsAfterInitialLoad);
  725 |         expect(consoleErrors.filter(e => !e.includes('favicon')), 'Console sem erros').toEqual([]);
  726 |     });
  727 | 
  728 |     // ==========================================
  729 |     // CENÁRIO 19 — Modal de Ambiente NÃO exibe Atributos Obrigatórios
  730 |     // ==========================================
  731 |     test('Cenário 19 — Modal de Ambiente não exibe seção de Atributos Obrigatórios', async ({ page }) => {
  732 |         await page.getByTestId('btn-new-environment').click();
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
```