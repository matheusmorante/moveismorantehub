# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\categories-deletion-safety.spec.ts >> Suíte Permanente E2E: Ambientes e Categorias >> Cenário 3 — Categoria em múltiplos Ambientes comprova o relacionamento N:N
- Location: tests\e2e\products\categories-deletion-safety.spec.ts:402:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('div[data-testid^="environment-row-env-sala"]').locator('text=PUFE COM AMBIENTES SEM PRODUTOS')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('div[data-testid^="environment-row-env-sala"]').locator('text=PUFE COM AMBIENTES SEM PRODUTOS') with timeout 5000ms
  - waiting for locator('div[data-testid^="environment-row-env-sala"]').locator('text=PUFE COM AMBIENTES SEM PRODUTOS')

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
  307 |             const req = route.request();
  308 |             const method = req.method().toUpperCase();
  309 |             const url = req.url();
  310 | 
  311 |             if (method === 'GET' || method === 'HEAD') {
  312 |                 const matchCat = url.match(/category_id=eq\.([^&]+)/);
  313 |                 if (matchCat) {
  314 |                     const cId = decodeURIComponent(matchCat[1]);
  315 |                     const filtered = currentCategoryAttributes.filter(ca => ca.category_id === cId);
  316 |                     // enriquece com o objeto attributes
  317 |                     const enriched = filtered.map(ca => ({
  318 |                         ...ca,
  319 |                         attributes: availableAttributes.find(a => a.id === ca.attribute_id) || null
  320 |                     }));
  321 |                     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(enriched) });
  322 |                     return;
  323 |                 }
  324 |                 await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentCategoryAttributes) });
  325 |             } else if (method === 'POST') {
  326 |                 const postData = req.postDataJSON();
  327 |                 const items = Array.isArray(postData) ? postData : [postData];
  328 |                 items.forEach((it: any) => currentCategoryAttributes.push(it));
  329 |                 await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(items) });
  330 |             } else if (method === 'DELETE') {
  331 |                 const matchCat = url.match(/category_id=eq\.([^&]+)/);
  332 |                 if (matchCat) {
  333 |                     const cId = decodeURIComponent(matchCat[1]);
  334 |                     currentCategoryAttributes = currentCategoryAttributes.filter(ca => ca.category_id !== cId);
  335 |                 }
  336 |                 await route.fulfill({ status: 204, body: '' });
  337 |             } else {
  338 |                 await route.continue();
  339 |             }
  340 |         });
  341 | 
  342 |         await page.goto(`/registrations/product-categories?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  343 |     });
  344 | 
  345 |     test.afterEach(async () => {
  346 |         const criticalErrors = consoleErrors.filter(
  347 |             msg =>
  348 |                 !msg.includes('favicon') &&
  349 |                 !msg.includes('React DevTools') &&
  350 |                 !msg.includes('net::ERR_FAILED') &&
  351 |                 !msg.includes('Failed to load resource')
  352 |         );
  353 |         expect(criticalErrors, 'Erros críticos de console detectados').toEqual([]);
  354 |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  355 |     });
  356 | 
  357 |     // ==========================================
  358 |     // CENÁRIO 1 — Criar Ambiente
  359 |     // ==========================================
  360 |     test('Cenário 1 — Criar Ambiente: modal, cadastro, exibição e persistência após reload', async ({ page }) => {
  361 |         await page.getByTestId('btn-new-environment').click();
  362 | 
  363 |         const input = page.getByPlaceholder(/ex: cozinha/i);
  364 |         await expect(input).toBeVisible();
  365 |         await input.fill('COZINHA PLANEJADA');
  366 | 
  367 |         await page.getByRole('button', { name: /salvar/i }).click();
  368 | 
  369 |         // Deve aparecer na lista
  370 |         await expect(page.locator('text=COZINHA PLANEJADA')).toBeVisible({ timeout: 5000 });
  371 | 
  372 |         // Recarrega a página e confirma persistência
  373 |         await page.reload({ waitUntil: 'domcontentloaded' });
  374 |         await expect(page.locator('text=COZINHA PLANEJADA')).toBeVisible({ timeout: 5000 });
  375 |     });
  376 | 
  377 |     // ==========================================
  378 |     // CENÁRIO 2 — Criar Categoria
  379 |     // ==========================================
  380 |     test('Cenário 2 — Criar Categoria: modal, cadastro, exibição em Categorias e persistência', async ({ page }) => {
  381 |         await page.getByTestId('btn-new-category').click();
  382 | 
  383 |         const input = page.getByPlaceholder(/ex: sofá/i);
  384 |         await expect(input).toBeVisible();
  385 |         await input.fill('MESA DE JANTAR');
  386 | 
  387 |         await page.getByRole('button', { name: /salvar/i }).click();
  388 | 
  389 |         // Muda para a aba Categorias
  390 |         await page.getByTestId('tab-view-categoria').click();
  391 |         await expect(page.locator('table').getByText('MESA DE JANTAR')).toBeVisible({ timeout: 5000 });
  392 | 
  393 |         // Recarrega e confirma persistência
  394 |         await page.reload({ waitUntil: 'domcontentloaded' });
  395 |         await page.getByTestId('tab-view-categoria').click();
  396 |         await expect(page.locator('table').getByText('MESA DE JANTAR')).toBeVisible({ timeout: 5000 });
  397 |     });
  398 | 
  399 |     // ==========================================
  400 |     // CENÁRIO 3 — Categoria em múltiplos Ambientes (N:N)
  401 |     // ==========================================
  402 |     test('Cenário 3 — Categoria em múltiplos Ambientes comprova o relacionamento N:N', async ({ page }) => {
  403 |         // Aba Por ambiente: PUFE aparece em SALA e em QUARTO
  404 |         const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
  405 |         const quartoRow = page.locator('div[data-testid^="environment-row-env-quarto"]');
  406 | 
> 407 |         await expect(salaRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();
      |                                                                               ^ Error: expect(locator).toBeVisible() failed
  408 |         await expect(quartoRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();
  409 | 
  410 |         // Aba Categorias: PUFE lista ambos os ambientes
  411 |         await page.getByTestId('tab-view-categoria').click();
  412 |         const pufeRow = page.locator('tr[data-testid^="category-row-cat-pufe"]');
  413 |         await expect(pufeRow).toBeVisible();
  414 |         await expect(pufeRow.locator('text=SALA DE ESTAR')).toBeVisible();
  415 |         await expect(pufeRow.locator('text=QUARTO CASAL')).toBeVisible();
  416 |     });
  417 | 
  418 |     // ==========================================
  419 |     // CENÁRIO 4 — Ambiente com múltiplas Categorias
  420 |     // ==========================================
  421 |     test('Cenário 4 — Ambiente com múltiplas Categorias: listagem e contadores corretos', async ({ page }) => {
  422 |         const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
  423 |         await expect(salaRow).toBeVisible();
  424 | 
  425 |         // SALA possui 3 categorias vinculadas: Sofá, Pufe e Cadeira Multi
  426 |         await expect(salaRow.getByText('3 categorias', { exact: true })).toBeVisible();
  427 |         await expect(salaRow.locator('text=SOFÁ COM PRODUTOS')).toBeVisible();
  428 |         await expect(salaRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();
  429 |         await expect(salaRow.locator('text=CADEIRA MULTI AMBIENTES')).toBeVisible();
  430 |     });
  431 | 
  432 |     // ==========================================
  433 |     // CENÁRIO 5 — Desvincular sem excluir
  434 |     // ==========================================
  435 |     test('Cenário 5 — Desvincular Categoria de Ambiente remove vínculo sem excluir a Categoria', async ({ page }) => {
  436 |         const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
  437 |         const quartoRow = page.locator('div[data-testid^="environment-row-env-quarto"]');
  438 | 
  439 |         // Configura aceitação do diálogo de confirmação
  440 |         page.on('dialog', async dialog => {
  441 |             expect(dialog.message()).toContain('Desvincular');
  442 |             await dialog.accept();
  443 |         });
  444 | 
  445 |         // Clica no x do chip do Pufe dentro da Sala
  446 |         const chipPufeSala = salaRow.locator('span:has-text("PUFE COM AMBIENTES SEM PRODUTOS")');
  447 |         const unlinkBtn = chipPufeSala.locator('button[title*="Desvincular"]');
  448 |         await unlinkBtn.click();
  449 | 
  450 |         // Pufe deve desaparecer da Sala
  451 |         await expect(salaRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).not.toBeVisible();
  452 | 
  453 |         // Pufe DEVE continuar no Quarto
  454 |         await expect(quartoRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();
  455 | 
  456 |         // Pufe DEVE continuar existindo na aba Categorias
  457 |         await page.getByTestId('tab-view-categoria').click();
  458 |         const pufeRow = page.locator('tr[data-testid^="category-row-cat-pufe"]');
  459 |         await expect(pufeRow).toBeVisible();
  460 |     });
  461 | 
  462 |     // ==========================================
  463 |     // CENÁRIO 6 — Exclusão de Ambiente bloqueada
  464 |     // ==========================================
  465 |     test('Cenário 6 — Exclusão de Ambiente bloqueada quando possui categorias vinculadas', async ({ page }) => {
  466 |         const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
  467 |         await expect(salaRow).toBeVisible();
  468 | 
  469 |         const deleteRegion = salaRow.locator('div[role="region"][aria-disabled="true"]');
  470 |         await expect(deleteRegion).toBeVisible();
  471 | 
  472 |         const deleteBtn = deleteRegion.locator('button');
  473 |         await expect(deleteBtn).toBeDisabled();
  474 | 
  475 |         await deleteRegion.hover();
  476 |         const tooltip = deleteRegion.locator('div[role="tooltip"]');
  477 |         await expect(tooltip).toBeVisible();
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
```