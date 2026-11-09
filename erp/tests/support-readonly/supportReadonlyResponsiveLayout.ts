import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

export async function verifySupportInboxResponsiveLayout(
  page: Page,
  conversationList: Locator,
  resetLayoutButton: Locator,
  testInfo: TestInfo,
): Promise<void> {
  const inboxPanel = page.getByTestId('customer-support-inbox-panel');
  const conversationsPanel = page.getByTestId('customer-support-conversations-panel');
  const inboxToggle = page.getByRole('button', { name: 'Caixa de entrada', exact: true });
  const conversationsToggle = page.getByRole('button', { name: 'Mostrar ou recolher lista de conversas', exact: true });
  const inboxHandle = page.getByRole('separator', { name: 'Redimensionar painel: Pastas e filas', exact: true });
  const conversationsHandle = page.getByRole('separator', { name: 'Redimensionar painel: Lista de conversas', exact: true });

  await expect(inboxHandle).toBeVisible();
  await expect(conversationsHandle).toBeVisible();
  if (await inboxToggle.getAttribute('aria-expanded') !== 'true') await inboxToggle.click();
  if (await conversationsToggle.getAttribute('aria-expanded') !== 'true') await conversationsToggle.click();

  await inboxHandle.focus();
  await inboxHandle.press('End');
  await expect(inboxHandle).toHaveAttribute('aria-valuenow', '360');
  await inboxHandle.press('Home');
  await expect(inboxHandle).toHaveAttribute('aria-valuenow', '180');
  await inboxHandle.press('ArrowRight');
  await expect(inboxHandle).toHaveAttribute('aria-valuenow', '196');
  await expect.poll(async () => Math.round((await inboxPanel.boundingBox())?.width || 0)).toBe(196);

  const inboxBounds = await inboxHandle.boundingBox();
  expect(inboxBounds).toBeTruthy();
  await page.mouse.move(inboxBounds!.x + 4, inboxBounds!.y + Math.min(120, inboxBounds!.height / 2));
  await page.mouse.down();
  await page.mouse.move(inboxBounds!.x - 64, inboxBounds!.y + Math.min(120, inboxBounds!.height / 2), { steps: 4 });
  await page.mouse.up();
  await expect(inboxHandle).toHaveAttribute('aria-valuenow', '0');
  await expect(inboxPanel).toHaveAttribute('aria-hidden', 'true');
   await expect.poll(async () => Math.round((await conversationsPanel.boundingBox())?.width || 0)).toBe(340);
  await inboxToggle.click();
  await expect(inboxPanel).toHaveAttribute('aria-hidden', 'false');
  await inboxHandle.dblclick();
  await expect(inboxHandle).toHaveAttribute('aria-valuenow', '220');
   await expect.poll(async () => Math.round((await conversationsPanel.boundingBox())?.width || 0)).toBe(340);

  await conversationsHandle.focus();
  await conversationsHandle.press('End');
  await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '600');
  await conversationsHandle.press('Home');
  await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '260');
  await expect.poll(async () => Math.round((await conversationsPanel.boundingBox())?.width || 0)).toBe(260);
  const conversationsBounds = await conversationsHandle.boundingBox();
  expect(conversationsBounds).toBeTruthy();
  await page.mouse.move(conversationsBounds!.x + 4, conversationsBounds!.y + Math.min(120, conversationsBounds!.height / 2));
  await page.mouse.down();
  await page.mouse.move(conversationsBounds!.x - 48, conversationsBounds!.y + Math.min(120, conversationsBounds!.height / 2), { steps: 4 });
  await page.mouse.up();
  await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '0');
  await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'true');
   await expect.poll(async () => Math.round((await inboxPanel.boundingBox())?.width || 0)).toBe(220);
  await conversationsToggle.click();
  await conversationsHandle.dblclick();
  await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '340');
   await expect.poll(async () => Math.round((await inboxPanel.boundingBox())?.width || 0)).toBe(220);

   await inboxHandle.focus();
   await inboxHandle.press('End');
   await expect(inboxHandle).toHaveAttribute('aria-valuenow', '360');
   const panelBudgetMetrics = await page.getByTestId('customer-support-layout').evaluate((layout) => {
     const children = Array.from(layout.children) as HTMLElement[];
     return {
       layoutWidth: layout.clientWidth,
       navigationWidth: children[0]?.getBoundingClientRect().width || 0,
       handleWidths: Array.from(layout.querySelectorAll('[role="separator"]')).map((handle) =>
         handle.getBoundingClientRect().width
       ),
       inboxWidth: children[1]?.getBoundingClientRect().width || 0,
       conversationsWidth: children[3]?.getBoundingClientRect().width || 0,
       chatWidth: children[5]?.getBoundingClientRect().width || 0,
     };
   });
   console.info(`[support-readonly] Medidas dos painéis após expandir a Inbox: ${JSON.stringify(panelBudgetMetrics)}; max conversa=${await conversationsHandle.getAttribute('aria-valuemax')}.`);
   await conversationsHandle.focus();
   const availableConversationWidth = Number(await conversationsHandle.getAttribute('aria-valuemax'));
   await conversationsHandle.press('End');
   await expect(conversationsHandle).toHaveAttribute('aria-valuenow', String(availableConversationWidth));
   await expect.poll(async () => Math.round((await conversationsPanel.boundingBox())?.width || 0))
     .toBe(availableConversationWidth);
   const desktopMaximumMetrics = await page.getByTestId('customer-support-layout').evaluate((layout) => {
     const children = Array.from(layout.children) as HTMLElement[];
     return {
       clientWidth: layout.clientWidth,
       scrollWidth: layout.scrollWidth,
       inboxWidth: children[1]?.getBoundingClientRect().width || 0,
       conversationsWidth: children[3]?.getBoundingClientRect().width || 0,
       chatWidth: children[5]?.getBoundingClientRect().width || 0,
     };
   });
   expect(desktopMaximumMetrics.inboxWidth).toBe(360);
   expect(availableConversationWidth).toBe(600);
   expect(desktopMaximumMetrics.conversationsWidth).toBeLessThanOrEqual(availableConversationWidth);
   expect(desktopMaximumMetrics.conversationsWidth).toBeGreaterThanOrEqual(260);
   expect(desktopMaximumMetrics.conversationsWidth).toBe(600);
   expect(desktopMaximumMetrics.chatWidth).toBeGreaterThanOrEqual(240);
   expect(desktopMaximumMetrics.scrollWidth).toBeLessThanOrEqual(desktopMaximumMetrics.clientWidth + 1);
   await resetLayoutButton.click();

  const cardHeadings = conversationList.locator('[role="button"] h4');
  const safeConversationIndex = await cardHeadings.evaluateAll((headings) =>
    headings.findIndex((heading) => !heading.closest('[role="button"]')?.querySelector('span.bg-blue-600'))
  );
  let selectedName: string | null = null;
  if (safeConversationIndex >= 0) {
    const selectedCardHeading = cardHeadings.nth(safeConversationIndex);
    await expect(selectedCardHeading).toBeVisible();
    await expect.poll(() => selectedCardHeading.evaluate((heading) =>
      !heading.closest('[role="button"]')?.querySelector('span.bg-blue-600')
    )).toBe(true);
    selectedName = (await selectedCardHeading.textContent())?.trim() || null;
    await selectedCardHeading.click();
    const chatHeading = page.getByRole('heading', { name: selectedName, exact: true }).last();
    await expect(chatHeading).toBeVisible();
    const listScrollBeforeCollapse = await conversationList.evaluate((element) => element.scrollTop);
    await conversationsToggle.click();
    await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'true');
    await expect(chatHeading).toBeVisible();
    await conversationsToggle.click();
    await expect(chatHeading).toBeVisible();
    await expect.poll(() => conversationList.evaluate((element) => element.scrollTop)).toBe(listScrollBeforeCollapse);
  } else {
    testInfo.annotations.push({ type: 'selection-limitation', description: 'Nenhuma conversa carregada sem badge de não lidas; a prova evitou abrir uma conversa que pudesse disparar confirmação de leitura.' });
  }

  const layoutSearch = page.getByPlaceholder('Pesquisar por cliente, telefone ou pedido...', { exact: true });
  await expect.poll(async () => Math.round((await conversationsPanel.boundingBox())?.width || 0)).toBe(340);
  if (!await layoutSearch.isVisible()) {
    const searchToggle = page.getByTitle('Alternar campo de busca', { exact: true });
    await expect(searchToggle).toBeVisible();
    await searchToggle.scrollIntoViewIfNeeded();
    await searchToggle.click();
  }
  await expect(layoutSearch).toBeVisible();
  await layoutSearch.fill('__central_panel_search_retention__');
  await expect(page.getByRole('heading', { name: 'Nenhuma conversa encontrada', exact: true })).toBeVisible();
  await conversationsToggle.click();
  await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'true');
  await conversationsToggle.click();
  await expect(layoutSearch).toHaveValue('__central_panel_search_retention__');
  await layoutSearch.fill('');

  const unassignedFilter = inboxPanel.getByRole('button', { name: /Não atribuídas/ }).first();
  const [unassignedResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/rest/v1/rpc/customer_support_list_conversations')
      && response.request().postDataJSON()?.p_filter === 'unassigned', { timeout: 15_000 }),
    unassignedFilter.click(),
  ]);
  expect(unassignedResponse.status()).toBe(200);
  await expect(unassignedFilter).toHaveClass(/bg-blue-600/);
  await inboxToggle.click();
  await expect(inboxPanel).toHaveAttribute('aria-hidden', 'true');
  await inboxToggle.click();
  await expect(inboxPanel).toHaveAttribute('aria-hidden', 'false');
  await expect(unassignedFilter).toHaveClass(/bg-blue-600/);
  if (selectedName) await expect(page.getByRole('heading', { name: selectedName, exact: true }).last()).toBeVisible();

  await expect.poll(async () => page.evaluate(() => {
    const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('morantehub_customer_support_layout_'));
    const value = key ? localStorage.getItem(key) : null;
    return value ? JSON.parse(value) : null;
  })).not.toBeNull();
  const savedPreferences = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('morantehub_customer_support_layout_'));
    const value = key ? localStorage.getItem(key) : null;
    return value ? JSON.parse(value) : null;
  });
  expect(savedPreferences).toMatchObject({ inboxWidth: 220, conversationsWidth: 340, isInboxOpen: true, isConversationsOpen: true });

  const previousViewport = page.viewportSize() ?? await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(inboxHandle).toBeHidden();
  await expect(conversationsHandle).toBeHidden();
  if (selectedName) await expect(page.getByRole('heading', { name: selectedName, exact: true }).last()).toBeVisible();
  await inboxToggle.click();
  const inboxAside = page.getByLabel('Pastas e filas de atendimento', { exact: true });
  await expect(inboxAside).toBeVisible();
  const mobileBounds = await inboxAside.boundingBox();
  expect(mobileBounds).toBeTruthy();
  expect(mobileBounds!.x).toBeGreaterThanOrEqual(55);
  expect(mobileBounds!.x + mobileBounds!.width).toBeLessThanOrEqual(391);
  const inboxBackdrop = page.getByRole('button', { name: 'Fechar pastas e filas', exact: true });
  const backdropBounds = await inboxBackdrop.boundingBox();
  expect(backdropBounds).toBeTruthy();
  await page.mouse.click(backdropBounds!.x + backdropBounds!.width - 10, backdropBounds!.y + backdropBounds!.height / 2);
  await expect(inboxPanel).toHaveAttribute('aria-hidden', 'true');
  if (selectedName) {
    await conversationsToggle.click();
    await expect(conversationList).toBeVisible();
  }
  const afterMobilePreferences = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('morantehub_customer_support_layout_'));
    const value = key ? localStorage.getItem(key) : null;
    return value ? JSON.parse(value) : null;
  });
  expect(afterMobilePreferences).toEqual(savedPreferences);
  if (previousViewport) await page.setViewportSize(previousViewport);
  await expect(inboxHandle).toHaveAttribute('aria-valuenow', '220');
  await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '340');

  const chatContent = page.getByRole('heading', { name: 'Central de Atendimento MoranteHub', exact: true });
  await inboxToggle.click();
  await conversationsToggle.click();
  await expect(inboxPanel).toHaveAttribute('aria-hidden', 'true');
  await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'true');
  await expect(inboxToggle).toBeVisible();
  await expect(conversationsToggle).toBeVisible();
  await expect(chatContent).toBeVisible();
  await expect(inboxHandle).toHaveAttribute('aria-valuenow', '0');
  await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '0');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(inboxPanel).toHaveAttribute('aria-hidden', 'true');
  await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'true');
  await inboxToggle.click();
  await conversationsToggle.click();
  await expect(inboxHandle).toHaveAttribute('aria-valuenow', '220');
  await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '340');

  await page.setViewportSize({ width: 768, height: 844 });
  const tabletMetrics = await page.getByTestId('customer-support-layout').evaluate((layout) => {
    const children = Array.from(layout.children) as HTMLElement[];
    return {
      clientWidth: layout.clientWidth,
      scrollWidth: layout.scrollWidth,
      inboxWidth: children[1]?.getBoundingClientRect().width || 0,
      conversationsWidth: children[3]?.getBoundingClientRect().width || 0,
      chatWidth: children[5]?.getBoundingClientRect().width || 0,
    };
  });
  expect(tabletMetrics.scrollWidth).toBeLessThanOrEqual(tabletMetrics.clientWidth + 1);
  expect(tabletMetrics.inboxWidth).toBeGreaterThanOrEqual(180);
  expect(tabletMetrics.conversationsWidth).toBeGreaterThanOrEqual(260);
  expect(tabletMetrics.chatWidth).toBeGreaterThanOrEqual(240);
  await expect(inboxHandle).toBeVisible();
  await expect(conversationsHandle).toBeVisible();

  await inboxHandle.focus();
  await inboxHandle.press('End');
   const availableTabletInboxWidth = Number(await inboxHandle.getAttribute('aria-valuemax'));
   await expect(inboxHandle).toHaveAttribute('aria-valuenow', String(availableTabletInboxWidth));
   await expect.poll(async () => Number(await conversationsHandle.getAttribute('aria-valuemax')))
     .toBeGreaterThanOrEqual(260);
  await conversationsHandle.focus();
   const availableTabletConversationWidth = Number(await conversationsHandle.getAttribute('aria-valuemax'));
  await conversationsHandle.press('End');
   await expect(conversationsHandle).toHaveAttribute('aria-valuenow', String(availableTabletConversationWidth));
   const tabletMaximumMetrics = await page.getByTestId('customer-support-layout').evaluate((layout) => {
     const children = Array.from(layout.children) as HTMLElement[];
     return {
       clientWidth: layout.clientWidth,
       scrollWidth: layout.scrollWidth,
       inboxWidth: children[1]?.getBoundingClientRect().width || 0,
       conversationsWidth: children[3]?.getBoundingClientRect().width || 0,
       chatWidth: children[5]?.getBoundingClientRect().width || 0,
     };
   });
   expect(tabletMaximumMetrics.inboxWidth).toBeGreaterThanOrEqual(180);
   expect(tabletMaximumMetrics.conversationsWidth).toBe(availableTabletConversationWidth);
   expect(tabletMaximumMetrics.chatWidth).toBeGreaterThanOrEqual(240);
   expect(tabletMaximumMetrics.scrollWidth).toBeLessThanOrEqual(tabletMaximumMetrics.clientWidth + 1);
  await page.getByRole('button', { name: 'Restaurar layout padrão', exact: true }).click();
  await expect.poll(async () => Number(await inboxHandle.getAttribute('aria-valuenow')))
    .toBe(Math.round((await inboxPanel.boundingBox())?.width || 0));
  await expect.poll(async () => Number(await conversationsHandle.getAttribute('aria-valuenow')))
    .toBe(Math.round((await conversationsPanel.boundingBox())?.width || 0));
  await expect(inboxPanel).toHaveAttribute('aria-hidden', 'false');
  await expect(conversationsPanel).toHaveAttribute('aria-hidden', 'false');
  const tabletSavedPreferences = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((candidate) => candidate.startsWith('morantehub_customer_support_layout_'));
    const value = key ? localStorage.getItem(key) : null;
    return value ? JSON.parse(value) : null;
  });
  expect(tabletSavedPreferences).toMatchObject({ inboxWidth: 220, conversationsWidth: 340 });
  await page.setViewportSize({ width: 1280, height: 844 });
  await expect(inboxHandle).toHaveAttribute('aria-valuenow', '220');
  await expect(conversationsHandle).toHaveAttribute('aria-valuenow', '340');
  console.info('[support-readonly] Larguras, filtros/busca/rolagem e seleção preservados ao recolher no desktop, fechamento simultâneo, persistência após reload, reset global e breakpoints mobile/tablet confirmados; nenhuma gravação comercial foi feita.');
  testInfo.annotations.push({ type: 'customer-support-layout', description: 'Inbox 180–360px e conversas 260–600px: teclado e arraste conferidos, recolhimento independente/simultâneo, reabertura, reset individual/global e persistência após reload. Filtro, busca e scroll preservados; a seleção é preservada ao recolher no desktop. Em 390px mobile, a navegação lista/chat usa overlay sem sobrescrever preferências; em 768px tablet, o chat permanece utilizável sem rolagem horizontal.' });
}
