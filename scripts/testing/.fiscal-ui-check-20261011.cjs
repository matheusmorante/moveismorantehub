const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
const { chromium } = require(path.join(root, 'erp', 'node_modules', 'playwright'));
const emit = (event, data = {}) => process.stdout.write(JSON.stringify({ event, ...data }) + '\n');

(async () => {
  const ready = Boolean(email && password && process.env.VERCEL_ENV === 'development' && process.env.MORANTE_ENV_SOURCE === 'vercel-development' && process.env.NFE_ENVIRONMENT === '2');
  emit('runtime-check', { development: process.env.VERCEL_ENV === 'development', sourceIsDev: process.env.MORANTE_ENV_SOURCE === 'vercel-development', hml: process.env.NFE_ENVIRONMENT === '2', credentialsPresent: Boolean(email && password) });
  if (!ready) process.exit(3);
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let authStatus = null;
  let identityMatches = false;
  let stage = 'startup';
  page.on('response', async (response) => {
    try {
      if (new URL(response.url()).pathname.includes('/auth/v1/token')) {
        authStatus = response.status();
        const body = await response.json().catch(() => null);
        const returnedEmail = body?.user?.email || body?.email || '';
        identityMatches = String(returnedEmail).trim().toLowerCase() === String(email).trim().toLowerCase();
      }
    } catch { /* sanitized diagnostic only */ }
  });
  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    stage = 'login-page-open';
    emit('login-page-open');
    await page.locator('input[type="email"]').first().fill(email, { timeout: 10000 });
    await page.locator('input[type="password"]').first().fill(password, { timeout: 10000 });
    await page.getByRole('button', { name: /Entrar no Sistema/i }).click({ timeout: 10000 });
    stage = 'profile-resolution';
    emit('login-submitted');
    await page.waitForFunction(() => /Aguardando Aprovação/i.test(document.body.innerText) || Array.from(document.querySelectorAll('button')).some((button) => /\bVendas\b/i.test(button.innerText)), null, { timeout: 45000 });
    const profileText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    const approval = /Aguardando Aprovação/i.test(profileText);
    const sales = /\bVendas\b/i.test(profileText) && !approval;
    const pageTitle = await page.title().catch(() => '');
    emit('profile-state', { authStatus, identityMatches, approvalVisible: approval, salesNavigationVisible: sales, path: new URL(page.url()).pathname, titleIsErp: /ERP Móveis Morante/i.test(pageTitle) });
    if (!sales || approval || authStatus !== 200 || !identityMatches) process.exitCode = 4;
    else {
      stage = 'fiscal-page-open';
      await page.goto('http://localhost:5173/fiscal-documents', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.getByRole('heading', { name: /Notas Fiscais de Saída/i }).waitFor({ state: 'visible', timeout: 15000 });
      stage = 'fiscal-filter-environment';
      await page.getByRole('button', { name: 'Mais filtros' }).click({ timeout: 10000 });
      const filterDialog = page.getByRole('dialog', { name: 'Mais filtros' });
      await filterDialog.waitFor({ state: 'visible', timeout: 10000 });
      const periodSelector = filterDialog.locator('select[aria-label="Período de emissão"]');
      const checkboxes = filterDialog.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();
      const periodSelectorCount = await periodSelector.count().catch(() => 0);
      emit('fiscal-filter-controls', { checkboxCount, periodSelectorCount });
      if (checkboxCount < 2) throw new Error('expected environment controls missing');
      const productionCheckbox = checkboxes.nth(0);
      const homologationCheckbox = checkboxes.nth(1);
      if (!(await homologationCheckbox.isChecked().catch(() => false))) await homologationCheckbox.check();
      if (await productionCheckbox.isChecked().catch(() => false)) await productionCheckbox.uncheck();
      stage = 'fiscal-filter-period';
      await periodSelector.selectOption('this_year');
      await filterDialog.getByRole('button', { name: 'Concluir' }).click({ timeout: 10000 });
      stage = 'fiscal-list-wait';
      const docRowsLocator = page.locator('table tbody tr');
      const fiscalListOutcome = await Promise.race([
        docRowsLocator.first().waitFor({ state: 'visible', timeout: 15000 }).then(() => 'rows').catch(() => null),
        page.getByText('Nenhum documento fiscal encontrado com os filtros atuais.', { exact: true }).waitFor({ state: 'visible', timeout: 15000 }).then(() => 'empty').catch(() => null),
        page.getByRole('alert').waitFor({ state: 'visible', timeout: 15000 }).then(() => 'error').catch(() => null),
      ]);
      if (!fiscalListOutcome) throw new Error('fiscal list did not reach a visible result');
      const docRows = await docRowsLocator.count().catch(() => 0);
      const docState = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
      const docSummary = await page.locator('table tbody tr').evaluateAll((rows) => rows.reduce((acc, row) => {
        const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.innerText);
        const doc = cells[1] || '';
        const env = cells[6] || '';
        if (/Homologa[cç][aã]o/i.test(env)) acc.homologation += 1;
        if (/55/.test(doc)) acc.model55 += 1;
        if (/65/.test(doc)) acc.model65 += 1;
        if ((cells[4] || '').trim()) acc.linkedOrders += 1;
        return acc;
      }, { homologation: 0, model55: 0, model65: 0, linkedOrders: 0 })).catch(() => ({ homologation: 0, model55: 0, model65: 0, linkedOrders: 0 }));
      emit('fiscal-list', { path: new URL(page.url()).pathname, tableRows: docRows, ...docSummary, emptyResults: /Nenhum documento fiscal encontrado/i.test(docState), loadError: /Não foi possível carregar as notas fiscais/i.test(docState) });
      stage = 'sales-page-open';
      await page.goto('http://localhost:5173/sales-order', { waitUntil: 'domcontentloaded', timeout: 20000 });
      stage = 'sales-list-wait';
      await page.getByText('Pedidos de Venda', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
      const orderRows = await page.locator('table tbody tr').count().catch(() => 0);
      const orderState = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
      emit('sales-list', { path: new URL(page.url()).pathname, tableRows: orderRows, hasSearchField: await page.locator('input').count() > 0, errorVisible: /erro ao carregar|falha ao carregar/i.test(orderState) });
    }
  } catch (error) {
    const finalText = await page.locator('body').innerText({ timeout: 1500 }).catch(() => '');
    const controls = await page.locator('input,select,button').evaluateAll((elements) => elements.slice(0, 20).map((element) => ({ tag: element.tagName, type: element.getAttribute('type'), ariaLabel: element.getAttribute('aria-label'), placeholder: element.getAttribute('placeholder') })) ).catch(() => []);
    emit('ui-error', { kind: error?.name || 'Error', stage, path: new URL(page.url()).pathname, atLogin: new URL(page.url()).pathname === '/login', hasFiscalHeader: /Notas Fiscais de Saída/i.test(finalText), hasPermissionMessage: /não tem acesso|permissão/i.test(finalText), hasApprovalMessage: /Aguardando Aprovação/i.test(finalText), hasSalesMenu: /\bVendas\b/i.test(finalText), inputCount: await page.locator('input').count().catch(() => 0), buttonCount: await page.locator('button').count().catch(() => 0), controls });
    process.exitCode = 5;
  } finally {
    await browser.close().catch(() => {});
  }
})().catch(() => { emit('runner-error'); process.exitCode = 6; });
