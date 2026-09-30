import { expect, test } from '@playwright/test';

const authQuery = 'auth_email=jev-test@example.com&user_id=mock-e2e-jev&auth_role=administrator';

test('Jev sugere NCM no cadastro e exige aceitação explícita', async ({ page }) => {
  let calls = 0;
  await page.addInitScript(() => {
    const session = {
      access_token: 'mock-jev-e2e-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      user: { id: 'mock-e2e-jev', email: 'jev-test@example.com', aud: 'authenticated', role: 'authenticated' },
    };
    localStorage.setItem('sb-hkoxhourxwlddgsfdgws-auth-token', JSON.stringify(session));
  });
  await page.route('**/api/products/classify', async (route) => {
    calls += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ category: null, ncm: { code: '94036000', description: 'Outros móveis de madeira' } }) });
  });
  await page.route('**/rest/v1/ncms?*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: '94036000', official_description: 'Outros móveis de madeira', active: true, start_date: null, end_date: null }) });
  });
  await page.goto(`/products?${authQuery}`, { waitUntil: 'domcontentloaded' });
  const options = page.locator('button[title="Opções"]').first();
  await expect(options).toBeVisible({ timeout: 15000 });
  await options.click();
  await page.getByRole('button', { name: 'Novo Produto' }).first().click();
  const name = page.locator('input[placeholder*="nome interno"]').first();
  await expect(name).toBeVisible();
  await page.waitForTimeout(700);
  await name.fill('Produto Jev Único 123');
  await name.blur();
  await expect(name).toHaveValue(/Produto Jev/);
  await page.getByRole('tab', { name: /Tributário|Fiscal/i }).click();
  await expect(page.getByText('Sugestão de NCM aguardando confirmação:', { exact: false })).toBeVisible({ timeout: 10000 });
  expect(calls).toBe(1);
  const ncmInput = page.getByPlaceholder('Digite ou pesquise o NCM...');
  await expect(ncmInput).toHaveValue('');
  await page.getByRole('button', { name: 'Rejeitar sugestão de NCM' }).click();
  await expect(page.getByText('Sugestão de NCM aguardando confirmação:', { exact: false })).toHaveCount(0);
  await expect(ncmInput).toHaveValue('');
  await page.waitForTimeout(1400);
  expect(calls).toBe(1);
  await page.getByRole('tab', { name: 'Cadastro Geral' }).click();
  await name.fill('Produto Jev Alterado 456');
  await name.blur();
  await page.getByRole('tab', { name: /Tributário|Fiscal/i }).click();
  await expect(page.getByText('Sugestão de NCM aguardando confirmação:', { exact: false })).toBeVisible({ timeout: 10000 });
  expect(calls).toBe(2);
  await page.getByRole('button', { name: 'Aceitar sugestão de NCM' }).click();
  await expect(ncmInput).toHaveValue('94036000');
  await expect(page.getByText('Sugestão de NCM aguardando confirmação:', { exact: false })).toHaveCount(0);
});
