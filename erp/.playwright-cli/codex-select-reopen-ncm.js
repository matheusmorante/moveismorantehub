async (page) => {
  const input = page.getByRole('textbox', { name: 'NCM' });
  if (!(await input.count())) return { modalOpen: false };
  await input.fill('cômoda');
  await page.waitForTimeout(1200);
  const selectedRow = await page.evaluate(() => {
    const pop = [...document.querySelectorAll('div')].find((e) => typeof e.className === 'string' && e.classList.contains('fixed') && e.className.includes('z-[100000000]') && e.className.includes('max-h-56') && e.getClientRects().length > 0);
    const row = pop && [...pop.children].find((e) => e.querySelector('span')?.textContent?.trim() === '94035000');
    row?.click();
    return !!row;
  });
  if (!selectedRow) return { modalOpen: true, taggedResultSelected: false };
  const selectedValue = await input.inputValue();
  await page.getByRole('button', { name: /Fechar emissão fiscal/ }).click();
  await page.waitForTimeout(700);
  const name = await page.evaluate(async () => {
    const m = await import('/src/pages/utils/supabaseConfig.ts');
    const { data, error } = await m.supabase.from('orders').select('order_data').eq('id', '23e0e9ee-5b62-4222-8aa5-6be4db5178c1').maybeSingle();
    if (error || !data) throw new Error('Candidato indisponível.');
    return data.order_data?.customerData?.fullName;
  });
  await page.getByPlaceholder('Buscar pedido pelo nome do cliente...').fill(name);
  await page.waitForTimeout(500);
  const order = page.getByText(/2638/).first();
  if (!(await order.count())) return { taggedResultSelected: true, selectedValue, orderVisibleAfterClose: false };
  const card = order.locator('xpath=ancestor::*[.//button[@title="Mais ações e opções de envio"]][1]');
  await card.locator('button[title="Mais ações e opções de envio"]').first().click();
  await page.getByRole('button', { name: /Ações pós-venda/ }).click();
  await page.getByRole('button', { name: /Emitir nota fiscal de saída/ }).click();
  await page.waitForTimeout(900);
  const reopened = page.getByRole('textbox', { name: 'NCM' });
  const dialog = page.getByRole('dialog').last();
  return {
    taggedResultSelected: true,
    selectedValue,
    orderVisibleAfterClose: true,
    reopenedModal: (await page.getByRole('dialog').count()) > 0,
    persistedDraftValue: await reopened.inputValue().catch(() => null),
    unregisteredItemMarker: await dialog.getByText(/não cadastrado|nao cadastrado|sem vínculo/i).count().then(n => n > 0).catch(() => false),
    hmlShown: await dialog.getByText(/Homologação/i).count().then(n => n > 0).catch(() => false),
  };
}
