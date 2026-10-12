import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { assertFiscalXmlMatchesSnapshot, type FiscalXmlItemExpectation } from './fiscalXmlAssertions';

function requireRuntimeCredential(name: string, value: string | undefined): string {
  const trimmed = value?.trim() || '';
  if (!trimmed || /^<redacted>$/i.test(trimmed) || trimmed.toLowerCase() === 'redacted') {
    throw new Error(
      `A credencial ${name} precisa vir do secret de runtime; o placeholder de interface <redacted> não é um valor válido.`,
    );
  }
  return value as string;
}

const operatorEmail = requireRuntimeCredential(
  'NFE_HML_TEST_OPERATOR_EMAIL',
  process.env.NFE_HML_TEST_OPERATOR_EMAIL,
).trim().toLowerCase();
const operatorPassword = requireRuntimeCredential(
  'NFE_HML_TEST_OPERATOR_PASSWORD',
  process.env.NFE_HML_TEST_OPERATOR_PASSWORD,
);

async function signInThroughUi(page: Page): Promise<void> {
  if (!operatorEmail || !operatorPassword) {
    throw new Error('A autenticação E2E exige as credenciais de runtime do operador autorizado.');
  }

  await test.step('Abrir login e autenticar pelo formulário real', async () => {
    await page.goto('/login');
    await page.getByPlaceholder('exemplo@email.com').fill(operatorEmail);
    await page.locator('input[type="password"]').fill(operatorPassword);
    await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
    await expect(page.locator('nav, banner, header').first()).toBeVisible({ timeout: 30000 });
  });
}

async function openTopMenu(page: Page, name: string, destinationName: RegExp): Promise<void> {
  await page.getByRole('button', { name: new RegExp(name, 'i') }).click();
  await page.getByRole('link', { name: destinationName }).click();
}

test.describe('Navegação real pela interface fiscal e comercial', () => {
  test('abre pedidos, devoluções, notas fiscais e cadastros pelos menus existentes', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await signInThroughUi(page);

    await test.step('Navegar até Pedidos de Venda e abrir o formulário de pedido', async () => {
      await openTopMenu(page, 'Vendas', /Pedidos de venda/i);
      await expect(page.getByRole('button', { name: /Nova Venda/i })).toBeVisible({ timeout: 15000 });
      await page.getByRole('button', { name: /Nova Venda/i }).click();
      await expect(page.getByRole('heading', { name: 'Novo Pedido' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('button', { name: 'Fechar pedido' }).click();
    });

    await test.step('Navegar até Devoluções pelo menu Vendas', async () => {
      await openTopMenu(page, 'Vendas', /Devoluções/i);
      await expect(page.getByRole('heading', { name: 'Devoluções' })).toBeVisible({ timeout: 15000 });
    });

    await test.step('Navegar até Notas Fiscais de Saída pelo menu Fiscal', async () => {
      await openTopMenu(page, 'Fiscal', /Notas fiscais de saída/i);
      await expect(page.getByRole('heading', { name: 'Notas Fiscais de Saída' })).toBeVisible({ timeout: 15000 });
    });

    await test.step('Abrir o formulário real de cadastro de cliente sem gravar', async () => {
      await openTopMenu(page, 'Pessoas', /Clientes Gestão de carteira/i);
      await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('button', { name: 'Novo Cliente' }).click();
      const customerDialog = page.getByRole('dialog');
      await expect(customerDialog).toBeVisible({ timeout: 15000 });
      await expect(customerDialog.getByPlaceholder('Nome do Cliente')).toBeVisible({ timeout: 15000 });
      await expect(customerDialog.locator('#person-cpf-cnpj')).toBeVisible({ timeout: 15000 });
      await customerDialog.getByRole('button', { name: 'Fechar', exact: true }).click();
      await expect(customerDialog).not.toBeVisible({ timeout: 15000 });
    });

    await test.step('Abrir o formulário real de cadastro de produto sem gravar', async () => {
      await openTopMenu(page, 'Produtos', /Cadastros/i);
      await page.getByTitle('Opções', { exact: true }).first().click();
      await page.getByRole('button', { name: 'Novo Produto' }).click();
      const productDialog = page.locator('[role="dialog"][aria-labelledby="product-form-title"]');
      await expect(productDialog).toBeVisible({ timeout: 15000 });
      await expect(
        productDialog.getByPlaceholder('Digite o nome interno do produto (ex: SOFA 3 LUG)...')
      ).toBeVisible({ timeout: 15000 });
      await expect(productDialog.getByRole('tab', { name: 'Tributário / NF' })).toBeVisible({ timeout: 15000 });
      await productDialog.getByRole('button', { name: 'Fechar formulário', exact: true }).click();
      await expect(productDialog).not.toBeVisible({ timeout: 15000 });
    });

    expect(pageErrors).toEqual([]);
  });

  test('mantém pedido e modais de cadastro utilizáveis em viewport mobile', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await signInThroughUi(page);

    await test.step('Verificar o formulário de pedido em tela estreita', async () => {
      await page.goto('/sales-order/new');
      await expect(page.getByRole('heading', { name: 'Novo Pedido' })).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('button', { name: 'Fechar pedido' })).toBeVisible({ timeout: 15000 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      await page.getByRole('button', { name: 'Fechar pedido' }).click();
    });

    await test.step('Verificar o cadastro de cliente em tela estreita', async () => {
      await page.goto('/registrations/customers');
      await page.getByRole('button', { name: 'Novo Cliente' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 15000 });
      await expect(dialog.getByPlaceholder('Nome do Cliente')).toBeVisible({ timeout: 15000 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
    });

    await test.step('Verificar o cadastro fiscal do produto em tela estreita', async () => {
      await page.goto('/products');
      await page.getByTitle('Opções', { exact: true }).first().click();
      await page.getByRole('button', { name: 'Novo Produto' }).click();
      const dialog = page.locator('[role="dialog"][aria-labelledby="product-form-title"]');
      await expect(dialog).toBeVisible({ timeout: 15000 });
      await expect(dialog.getByPlaceholder('Digite o nome interno do produto (ex: SOFA 3 LUG)...')).toBeVisible({ timeout: 15000 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
      await dialog.getByRole('button', { name: 'Fechar formulário', exact: true }).click();
      await expect(dialog).not.toBeVisible({ timeout: 15000 });
    });
  });

  test('usa o pedido persistido selecionado, valida o XML em HML e só transmite com autorização explícita', async ({ page }) => {
    test.setTimeout(180_000);
    const orderId = process.env.FISCAL_E2E_SELECTED_ORDER_ID || '';
    const customerSearchLabel = process.env.FISCAL_E2E_CUSTOMER_SEARCH_LABEL || '';
    const transmissionAuthorized = process.env.FISCAL_E2E_MODE === 'hml'
      && process.env.FISCAL_E2E_TRANSMISSION_AUTHORIZED === 'true';
    if (!orderId || customerSearchLabel.trim().length < 3) {
      throw new Error('O resolvedor não selecionou um pedido fiscal persistido e autorizado.');
    }

    await page.setViewportSize({ width: 1920, height: 1080 });
    await signInThroughUi(page);
    await page.goto('/sales-order');
    const customerSearch = page.getByPlaceholder('Buscar pedido pelo nome do cliente (mín. 3 caracteres)...');
    await customerSearch.fill(customerSearchLabel);

    const orderRow = page.locator('#order-row-' + orderId);
    await expect(orderRow).toBeVisible({ timeout: 30000 });
    await orderRow.locator('button[title="Mais ações e opções de envio"]').click();
    await page.getByRole('button', { name: /Ações pós-venda/i }).click();

    const postOrderDialog = page.locator('[role="dialog"][aria-labelledby="post-order-title"]');
    await expect(postOrderDialog).toBeVisible({ timeout: 10000 });
    const issueButton = postOrderDialog.getByRole('button', { name: /Emitir nota fiscal de saída/i });
    await expect(issueButton).toBeEnabled({ timeout: 10000 });
    await issueButton.click();

    const environmentDialog = page.locator('[role="dialog"][aria-labelledby="nfe-environment-choice-title"]');
    await expect(environmentDialog).toBeVisible({ timeout: 10000 });
    await environmentDialog.getByRole('button', { name: /Homologação/i }).click();

    const emissionModal = page.locator('[role="dialog"][aria-label="Emitir nota fiscal de saída"]');
    await expect(emissionModal).toBeVisible({ timeout: 15000 });
    await expect(emissionModal).toHaveAttribute('aria-busy', 'false', { timeout: 60000 });
    await expect(emissionModal.getByText('Homologação', { exact: true })).toBeVisible();
    await expect(emissionModal.getByText(/Homologação · teste sem valor fiscal/i)).toBeVisible();

    const itemsForSnapshot: FiscalXmlItemExpectation[] = [];
    await emissionModal.locator('#tab-customer').click();
    const taxIdInput = emissionModal.locator('#nfe-recipient-tax-id');
    await expect(taxIdInput).toBeVisible();
    const taxId = (await taxIdInput.inputValue()).replace(/\D/g, '');
    const taxIdRequired = await emissionModal.getByText('Identificação obrigatória', { exact: true })
      .isVisible().catch(() => false);
    if (taxIdRequired && !taxId) {
      throw new Error('O pedido persistido não tem identificação exigida; nenhum dado fiscal será inventado.');
    }

    await emissionModal.locator('#tab-items').click();
    const ncmInputs = emissionModal.locator('input[id^="nfe-item-ncm-"]');
    const itemCount = await ncmInputs.count();
    expect(itemCount).toBeGreaterThan(0);
    for (let index = 0; index < itemCount; index++) {
      const ncm = (await emissionModal.locator('#nfe-item-ncm-' + index).inputValue()).replace(/\D/g, '');
      expect(ncm).toMatch(/^\d{8}$/);
      await emissionModal.locator('button[title="Ver / editar CFOP, CSOSN, Origem e CEST"]').nth(index).click();
      const origin = await emissionModal.locator('#nfe-item-origem-' + index).inputValue();
      const cfop = (await emissionModal.locator('#nfe-item-cfop-' + index).inputValue()).replace(/\D/g, '');
      const csosn = (await emissionModal.locator('#nfe-item-csosn-' + index).inputValue()).replace(/\D/g, '');
      const cest = (await emissionModal.locator('#nfe-item-cest-' + index).inputValue()).replace(/\D/g, '');
      expect(origin).toMatch(/^[0-8]$/);
      expect(cfop).toMatch(/^\d{4}$/);
      expect(csosn).toMatch(/^\d{3}$/);
      if (cest) expect(cest).toMatch(/^\d{7}$/);
      itemsForSnapshot.push({ ncm, cfop, origin });
    }
    await emissionModal.locator('#tab-general').click();

    const previewButton = emissionModal.getByTestId('nfe-preview-xml-button');
    await expect(previewButton).toBeEnabled({ timeout: 15000 });
    await previewButton.click();
    const previewDialog = page.getByTestId('nfe-xml-preview-dialog');
    await expect(previewDialog).toBeVisible({ timeout: 60000 });
    const xml = await page.getByTestId('nfe-xml-preview-content').innerText();
    expect(xml).toContain('<tpAmb>2</tpAmb>');
    const model = xml.match(/<mod>(55|65)<\/mod>/)?.[1] as '55' | '65' | undefined;
    expect(model).toBeDefined();
    assertFiscalXmlMatchesSnapshot(xml, {
      model: model as '55' | '65',
      environment: 2,
      operation: 'sale',
      items: itemsForSnapshot,
    });
    await page.getByTestId('nfe-xml-preview-close').click();
    await expect(previewDialog).not.toBeVisible();

    const emitButton = emissionModal.getByTestId('nfe-emit-button');
    await expect(emitButton).toBeVisible();
    await expect(emitButton).toHaveText(/Emitir NF[C]?-e em Homologação/i);
    if (!transmissionAuthorized) {
      await emissionModal.getByRole('button', { name: 'Fechar emissão fiscal' }).click();
      return;
    }

    await expect(emitButton).toBeEnabled();
    await emitButton.click();
    const detailsHeading = page.getByRole('heading', { name: 'Detalhes da nota fiscal' });
    await expect(detailsHeading).toBeVisible({ timeout: 60000 });
    const details = page.getByRole('dialog').filter({ has: detailsHeading });
    await expect(details.getByText('Homologação', { exact: true })).toBeVisible();
    await expect(details.getByText(/homologada/i).first()).toBeVisible({ timeout: 30000 });
    const protocol = (await details.locator('dt:has-text("Protocolo SEFAZ") + dd').innerText()).trim();
    expect(protocol).toMatch(/^\d{15}$/);

    const db = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await db.auth.signInWithPassword({
      email: operatorEmail,
      password: operatorPassword,
    });
    if (login.error || !login.session) throw new Error('Não foi possível validar o documento fiscal persistido.');
    const { data: documents, error: documentsError } = await db.from('nfe_documents')
      .select('id,modelo,ambiente,status,numero_protocolo')
      .eq('order_id', orderId)
      .eq('modelo', model)
      .eq('ambiente', 2);
    if (documentsError || !documents || documents.length !== 1) {
      throw new Error('O documento homologado não foi confirmado na persistência do Supabase.');
    }
    if (documents[0].status !== 'homologada' || documents[0].numero_protocolo !== protocol) {
      throw new Error('O documento homologado não foi confirmado na persistência do Supabase.');
    }
    console.log('[HML_UI_RESULT] state=authorized_in_hml; environment=2; persisted=true');
    await details.getByRole('button', { name: 'Fechar', exact: true }).first().click();
  });
});


\r\n