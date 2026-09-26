# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\categories-deletion-safety.spec.ts >> Suíte Permanente E2E: Ambientes e Categorias >> Cenário 2 — Criar Categoria: modal, cadastro, exibição em Categorias e persistência
- Location: tests\e2e\products\categories-deletion-safety.spec.ts:380:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('btn-new-category')

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
  281 |                 return;
  282 |             }
  283 | 
  284 |             await route.fulfill({
  285 |                 status: 200,
  286 |                 contentType: 'application/json',
  287 |                 body: JSON.stringify(currentProductCategories)
  288 |             });
  289 |         });
  290 | 
  291 |         await page.route('**/rest/v1/products*', async route => {
  292 |             await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  293 |         });
  294 | 
  295 |         await page.route('**/rest/v1/product_variations*', async route => {
  296 |             if (!['GET', 'HEAD'].includes(route.request().method().toUpperCase())) {
  297 |                 productVariationMutationCount++;
  298 |             }
  299 |             await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  300 |         });
  301 | 
  302 |         await page.route('**/rest/v1/attributes*', async route => {
  303 |             await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(availableAttributes) });
  304 |         });
  305 | 
  306 |         await page.route('**/rest/v1/category_attributes*', async route => {
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
> 381 |         await page.getByTestId('btn-new-category').click();
      |                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  407 |         await expect(salaRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();
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
```