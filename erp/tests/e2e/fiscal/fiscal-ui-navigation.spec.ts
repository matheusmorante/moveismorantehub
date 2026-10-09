import { expect, test, type Page, type TestInfo } from '@playwright/test';

const operatorEmail = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
const operatorPassword = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;

async function signInThroughUi(page: Page, testInfo: TestInfo): Promise<void> {
  if (!operatorEmail || !operatorPassword) {
    throw new Error('A autenticação E2E exige as credenciais de runtime do operador autorizado.');
  }

  await testInfo.step('Abrir login e autenticar pelo formulário real', async () => {
    await page.goto('/login');
    await page.getByPlaceholder('exemplo@email.com').fill(operatorEmail);
    await page.locator('input[type="password"]').fill(operatorPassword);
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await expect(page.getByRole('button', { name: 'Vendas' })).toBeVisible();
  });
}

async function openTopMenu(page: Page, name: string, destinationName: RegExp): Promise<void> {
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('link', { name: destinationName }).click();
}

test.describe('Navegação real pela interface fiscal e comercial', () => {
  test('abre pedidos, devoluções, notas fiscais e cadastros pelos menus existentes', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await signInThroughUi(page, testInfo);

    await testInfo.step('Navegar até Pedidos de Venda e abrir o formulário de pedido', async () => {
      await openTopMenu(page, 'Vendas', /Pedidos de venda/i);
      await expect(page.getByRole('heading', { name: 'Pedidos de Venda' })).toBeVisible();
      await page.getByRole('button', { name: 'Novo Pedido' }).click();
      await page.getByRole('button', { name: 'Pedido de Venda' }).click();
      await expect(page.getByRole('heading', { name: 'Novo Pedido' })).toBeVisible();
      await page.getByTitle('Passo 2: Itens').click();
      await expect(page.getByPlaceholder('Buscar produto no catálogo...')).toBeVisible();
      await page.getByRole('button', { name: 'Fechar pedido' }).click();
    });

    await testInfo.step('Navegar até Devoluções pelo menu Vendas', async () => {
      await openTopMenu(page, 'Vendas', /Devoluções/i);
      await expect(page.getByRole('heading', { name: 'Devoluções' })).toBeVisible();
    });

    await testInfo.step('Navegar até Notas Fiscais de Saída pelo menu Fiscal', async () => {
      await openTopMenu(page, 'Fiscal', /Notas fiscais de saída/i);
      await expect(page.getByRole('heading', { name: 'Notas Fiscais de Saída' })).toBeVisible();
    });

    await testInfo.step('Abrir o formulário real de cadastro de cliente sem gravar', async () => {
      await openTopMenu(page, 'Pessoas', /Clientes/i);
      await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
      await page.getByRole('button', { name: 'Novo Cliente' }).click();
      const customerDialog = page.getByRole('dialog');
      await expect(customerDialog).toBeVisible();
      await expect(customerDialog.getByPlaceholder('Nome do Cliente')).toBeVisible();
      await expect(customerDialog.locator('#person-cpf-cnpj')).toBeVisible();
      await customerDialog.getByRole('button', { name: 'Fechar', exact: true }).click();
      await expect(customerDialog).not.toBeVisible();
    });

    await testInfo.step('Abrir o formulário real de cadastro de produto sem gravar', async () => {
      await openTopMenu(page, 'Produtos', /Cadastros/i);
      await page.getByRole('button', { name: 'Novo Produto' }).click();
      const productDialog = page.locator('[role="dialog"][aria-labelledby="product-form-title"]');
      await expect(productDialog).toBeVisible();
      await expect(
        productDialog.getByPlaceholder('Digite o nome interno do produto (ex: SOFA 3 LUG)...')
      ).toBeVisible();
      await expect(productDialog.getByRole('tab', { name: 'Tributário / NF' })).toBeVisible();
      await productDialog.getByRole('button', { name: 'Fechar formulário' }).click();
      await expect(productDialog).not.toBeVisible();
    });

    expect(pageErrors).toEqual([]);
  });

  test('mantém pedido e modais de cadastro utilizáveis em viewport mobile', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await signInThroughUi(page, testInfo);

    await testInfo.step('Verificar o formulário de pedido em tela estreita', async () => {
      await page.goto('/sales-order/new');
      await expect(page.getByRole('heading', { name: 'Novo Pedido' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Fechar pedido' })).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      await page.getByRole('button', { name: 'Fechar pedido' }).click();
    });

    await testInfo.step('Verificar o cadastro de cliente em tela estreita', async () => {
      await page.goto('/registrations/customers');
      await page.getByRole('button', { name: 'Novo Cliente' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByPlaceholder('Nome do Cliente')).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
    });

    await testInfo.step('Verificar o cadastro fiscal do produto em tela estreita', async () => {
      await page.goto('/products');
      await page.getByRole('button', { name: 'Novo Produto' }).click();
      const dialog = page.locator('[role="dialog"][aria-labelledby="product-form-title"]');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByPlaceholder('Digite o nome interno do produto (ex: SOFA 3 LUG)...')).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      await dialog.getByRole('button', { name: 'Fechar formulário' }).click();
      await expect(dialog).not.toBeVisible();
    });
  });
});

