# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\categories-deletion-safety.spec.ts >> Suíte Permanente E2E: Ambientes e Categorias >> Cenário 11 — Busca contextual independente por aba
- Location: tests\e2e\products\categories-deletion-safety.spec.ts:576:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByPlaceholder(/buscar ambiente\.\.\./i)

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
  478 |         await expect(tooltip).toContainText('Não é possível excluir este ambiente porque ele possui 3 categorias vinculadas');
  479 |     });
  480 | 
  481 |     // ==========================================
  482 |     // CENÁRIO 7 — Exclusão de Ambiente permitida
  483 |     // ==========================================
  484 |     test('Cenário 7 — Exclusão de Ambiente permitida quando vazio (0 categorias)', async ({ page }) => {
  485 |         const varandaRow = page.locator('div[data-testid^="environment-row-env-varanda"]');
  486 |         await expect(varandaRow).toBeVisible();
  487 | 
  488 |         page.on('dialog', async dialog => {
  489 |             expect(dialog.message()).toContain('EXCLUIR');
  490 |             await dialog.accept();
  491 |         });
  492 | 
  493 |         const deleteBtn = varandaRow.locator('button[aria-label*="Excluir ambiente"]');
  494 |         await expect(deleteBtn).toBeEnabled();
  495 |         await deleteBtn.click();
  496 | 
  497 |         await expect(varandaRow).not.toBeVisible();
  498 | 
  499 |         // Recarrega e confirma persistência da exclusão
  500 |         await page.reload({ waitUntil: 'domcontentloaded' });
  501 |         await expect(page.locator('text=VARANDA VAZIA')).not.toBeVisible();
  502 |     });
  503 | 
  504 |     // ==========================================
  505 |     // CENÁRIO 8 — Exclusão de Categoria bloqueada
  506 |     // ==========================================
  507 |     test('Cenário 8 — Exclusão de Categoria bloqueada quando possui produtos vinculados', async ({ page }) => {
  508 |         await page.getByTestId('tab-view-categoria').click();
  509 | 
  510 |         const sofaRow = page.locator('tr[data-testid^="category-row-cat-sofa"]');
  511 |         await expect(sofaRow).toBeVisible();
  512 | 
  513 |         const deleteRegion = sofaRow.locator('div[role="region"][aria-disabled="true"]');
  514 |         await expect(deleteRegion).toBeVisible();
  515 | 
  516 |         const deleteBtn = deleteRegion.locator('button');
  517 |         await expect(deleteBtn).toBeDisabled();
  518 | 
  519 |         await deleteRegion.hover();
  520 |         const tooltip = deleteRegion.locator('div[role="tooltip"]');
  521 |         await expect(tooltip).toBeVisible();
  522 |         await expect(tooltip).toContainText('Não é possível excluir esta categoria porque ela está sendo utilizada por 2 produtos');
  523 |     });
  524 | 
  525 |     // ==========================================
  526 |     // CENÁRIO 9 — Categoria com 0 Produtos e Ambientes vinculados
  527 |     // ==========================================
  528 |     test('Cenário 9 — Categoria com 0 Produtos e Ambientes vinculados PODE ser excluída sem afetar Ambientes', async ({ page }) => {
  529 |         await page.getByTestId('tab-view-categoria').click();
  530 | 
  531 |         const pufeRow = page.locator('tr[data-testid^="category-row-cat-pufe"]');
  532 |         await expect(pufeRow).toBeVisible();
  533 | 
  534 |         page.on('dialog', async dialog => {
  535 |             expect(dialog.message()).toContain('EXCLUIR');
  536 |             await dialog.accept();
  537 |         });
  538 | 
  539 |         const deleteBtn = pufeRow.locator('button[aria-label*="Excluir categoria"]');
  540 |         await expect(deleteBtn).toBeEnabled();
  541 |         await deleteBtn.click();
  542 | 
  543 |         // Pufe foi removido
  544 |         await expect(pufeRow).not.toBeVisible();
  545 | 
  546 |         // Ambientes (Sala e Quarto) continuam existindo normalmente
  547 |         await page.getByTestId('tab-view-ambiente').click();
  548 |         await expect(page.locator('text=SALA DE ESTAR')).toBeVisible();
  549 |         await expect(page.locator('text=QUARTO CASAL')).toBeVisible();
  550 |     });
  551 | 
  552 |     // ==========================================
  553 |     // CENÁRIO 10 — Categoria completamente sem uso
  554 |     // ==========================================
  555 |     test('Cenário 10 — Categoria completamente sem uso (0 produtos, 0 ambientes) excluída normalmente', async ({ page }) => {
  556 |         await page.getByTestId('tab-view-categoria').click();
  557 | 
  558 |         const isoladaRow = page.locator('tr[data-testid^="category-row-cat-isolada"]');
  559 |         await expect(isoladaRow).toBeVisible();
  560 | 
  561 |         page.on('dialog', async dialog => {
  562 |             expect(dialog.message()).toContain('EXCLUIR');
  563 |             await dialog.accept();
  564 |         });
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
> 578 |         await searchInput.fill('QUARTO');
      |                           ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  665 |         await expect(salaRow.locator('text=SOFÁ COM PRODUTOS')).toBeVisible();
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
```