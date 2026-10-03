async (page) => {
  const name = await page.evaluate(async () => {
    const m = await import('/src/pages/utils/supabaseConfig.ts');
    const { data, error } = await m.supabase.from('orders').select('order_data').eq('id', '23e0e9ee-5b62-4222-8aa5-6be4db5178c1').maybeSingle();
    if (error || !data) throw new Error('Candidato indisponível na sessão autenticada.');
    return data.order_data?.customerData?.fullName;
  });
  await page.getByPlaceholder('Buscar pedido pelo nome do cliente...').fill(name);
  await page.waitForTimeout(600);
  const order = page.getByText(/2638/).first();
  if ((await order.count()) === 0) return { orderVisible: false };
  const card = order.locator('xpath=ancestor::*[.//button[@title="Mais ações e opções de envio"]][1]');
  const menu = card.locator('button[title="Mais ações e opções de envio"]').first();
  const menuCount = await menu.count();
  if (!menuCount) return { orderVisible: true, rowMenuFound: false };
  await menu.click();
  const postSale = page.getByRole('button', { name: /Ações pós-venda/ });
  const postSaleCount = await postSale.count();
  if (!postSaleCount) return { orderVisible: true, rowMenuFound: true, postSaleFound: false };
  await postSale.click();
  const emit = page.getByRole('button', { name: /Emitir nota fiscal de saída/ });
  const emitCount = await emit.count();
  if (!emitCount) return { orderVisible: true, rowMenuFound: true, postSaleFound: true, emitActionFound: false };
  await emit.click();
  await page.waitForTimeout(1000);
  const dialog = page.getByRole('dialog').last();
  const dialogCount = await page.getByRole('dialog').count();
  const ncmCount = await dialog.getByRole('textbox', { name: 'NCM' }).count().catch(() => 0);
  const unregisteredCount = await dialog.getByText(/não cadastrado|nao cadastrado|sem vínculo/i).count().catch(() => 0);
  const hml = await dialog.getByText(/Homologação/i).count().catch(() => 0);
  return { orderVisible: true, rowMenuFound: true, postSaleFound: true, emitActionFound: true, modalOpen: dialogCount > 0, ncmInputs: ncmCount, unregisteredItemMarker: unregisteredCount > 0, hmlShown: hml > 0 };
}
