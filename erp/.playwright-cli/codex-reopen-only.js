async (page) => {
  const input = page.getByRole('textbox', { name: 'NCM' });
  const selectedBeforeClose = await input.inputValue();
  await page.getByRole('button', { name: /Fechar emissão fiscal/ }).click();
  await page.waitForTimeout(600);
  const closed = (await page.getByRole('dialog').count()) === 0;
  const name = await page.evaluate(async () => {
    const m = await import('/src/pages/utils/supabaseConfig.ts');
    const { data, error } = await m.supabase.from('orders').select('order_data').eq('id', '23e0e9ee-5b62-4222-8aa5-6be4db5178c1').maybeSingle();
    if (error || !data) throw new Error('Candidato indisponível.');
    return data.order_data?.customerData?.fullName;
  });
  await page.getByPlaceholder('Buscar pedido pelo nome do cliente...').fill(name);
  await page.waitForTimeout(500);
  const order = page.getByText(/2638/).first();
  if (!(await order.count())) return { selectedBeforeClose, closed, orderVisible: false };
  const card = order.locator('xpath=ancestor::*[.//button[@title="Mais ações e opções de envio"]][1]');
  await card.locator('button[title="Mais ações e opções de envio"]').first().click();
  await page.getByRole('button', { name: /Ações pós-venda/ }).click();
  await page.getByRole('button', { name: /Emitir nota fiscal de saída/ }).click();
  await page.getByRole('textbox', { name: 'NCM' }).waitFor({ timeout: 5000 });
  const reopenedValue = await page.getByRole('textbox', { name: 'NCM' }).inputValue();
  const dialog = page.getByRole('dialog').last();
  return {
    selectedBeforeClose,
    closed,
    orderVisible: true,
    reopenedModal: (await page.getByRole('dialog').count()) > 0,
    reopenedValue,
    unregisteredItemMarker: await dialog.getByText(/não cadastrado|nao cadastrado|sem vínculo/i).count().then(n => n > 0).catch(() => false),
    hmlShown: await dialog.getByText(/Homologação/i).count().then(n => n > 0).catch(() => false),
  };
}
