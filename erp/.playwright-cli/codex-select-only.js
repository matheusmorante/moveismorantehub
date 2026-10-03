async (page) => {
  const input = page.getByRole('textbox', { name: 'NCM' });
  if (!(await input.count())) return { modalOpen: false };
  await input.fill('cômoda');
  await page.waitForTimeout(1400);
  const alias = page.getByText(/cômoda em MDF\/MDP/i);
  const count = await alias.count();
  if (!count) return { modalOpen: true, aliasCount: 0 };
  await alias.first().click();
  await page.waitForTimeout(250);
  return { modalOpen: true, aliasCount: count, selectedValue: await input.inputValue() };
}
