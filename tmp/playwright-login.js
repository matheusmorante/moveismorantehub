async (page) => {
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
  if (!email || !password) throw new Error('Operator credentials unavailable in Vercel development environment');
  await page.getByPlaceholder('exemplo@email.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /Entrar no Sistema/ }).click();
  await page.waitForTimeout(3000);
  return { url: page.url(), title: await page.title() };
}
