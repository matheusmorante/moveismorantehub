async (page) => {
  const cards = page.getByRole('button', { name: /#002638/ });
  const cardCount = await cards.count();
  if (cardCount !== 1) throw new Error(`target-card-count=${cardCount}`);
  const menu = page.getByTitle('Mais ações e opções de envio', { exact: true });
  const menuCount = await menu.count();
  if (menuCount !== 1) throw new Error(`menu-button-count=${menuCount}`);
  await menu.click();
  const options = page.getByText('Emitir nota fiscal de saída', { exact: true });
  const optionCount = await options.count();
  if (optionCount !== 1) throw new Error(`emission-option-count=${optionCount}`);
  return 'menu-open-and-option-visible';
}