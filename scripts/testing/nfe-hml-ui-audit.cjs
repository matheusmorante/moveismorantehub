// ERP employee flow. Read-only unless explicitly invoked with --emit-hml-3474.
const fs = require('node:fs');
const dotenv = require('dotenv');
const { spawnSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('../../erp/node_modules/@playwright/test');
const assert = require('node:assert/strict');
const { captureOperationalState } = require('./nfe-operational-audit.cjs');

async function main() {
  const [baseUrl, envPath, mode] = process.argv.slice(2);
  if (mode && mode !== '--emit-hml-3474') throw new Error('Unsupported UI audit mode.');
  const orderId = 'dc0641a1-f554-4769-a864-314c46a80f2e';
  let payload;
  if (!/^https:\/\/morantehub-[a-z0-9-]+\.vercel\.app$/.test(baseUrl || ''))
    throw new Error('A verified fiscal deployment URL is required.');
  const env = dotenv.parse(fs.readFileSync(envPath));
  const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
  const result = spawnSync('npx.cmd', ['--yes', 'vercel', 'api', `/v9/projects/${project.projectId}?teamId=${project.orgId}`, '--raw'],
    { shell: true, windowsHide: true, encoding: 'utf8', timeout: 60000 });
  if (result.status !== 0) throw new Error('Vercel project authentication unavailable.');
  const protection = JSON.parse(result.stdout).protectionBypass || {};
  const bypass = Object.keys(protection).find((key) => protection[key].scope === 'automation-bypass');
  if (!bypass) throw new Error('Authorized Vercel automation access is not configured.');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  // Scope the authorized automation header to this deployment, never Supabase/other sites.
  await page.route(`${baseUrl}/**`, async (route) => {
    const request = route.request();
    if (new URL(request.url()).pathname === '/api/nfe/emit' && request.method() === 'POST') {
      const command = request.postDataJSON();
      if (mode !== '--emit-hml-3474' || command.environment !== 2 || command.orderId !== orderId ||
          !command.itemFiscalSelections || command.documentId) {
        await route.abort();
        throw new Error('Blocked emission outside the explicitly selected HML order.');
      }
      payload = command;
    }
    await route.continue({ headers: { ...request.headers(), 'x-vercel-protection-bypass': bypass } });
  });
  page.setDefaultTimeout(15000);
  try {
    await page.goto(`${baseUrl}/login`);
    console.log(JSON.stringify({ stage: 'login-surface', url: page.url(), title: await page.title(),
      inputs: await page.locator('input').evaluateAll((inputs) => inputs.map((input) => ({
        type: input.type, placeholder: input.placeholder, name: input.name,
      }))) }));
    await page.getByPlaceholder('exemplo@email.com', { exact: true }).fill(env.VITE_AUDIT_USER);
    await page.getByPlaceholder('••••••••', { exact: true }).fill(env.VITE_AUDIT_PASS);
    await page.getByRole('button', { name: /Entrar no Sistema/ }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'));
    await page.goto(`${baseUrl}/sales-order`);
    await page.getByText('Pedidos de Venda', { exact: true }).first().waitFor();
    console.log(JSON.stringify({ stage: 'orders-ui', authenticated: true,
      inputs: await page.locator('input').evaluateAll((inputs) => inputs.map((input) =>
        ({ placeholder: input.placeholder, type: input.type, ariaLabel: input.getAttribute('aria-label') }))),
      visibleActionCount: await page.locator('button').count(),
    }));
    const knownOrder = page.locator('#order-card-dc0641a1-f554-4769-a864-314c46a80f2e, #order-row-dc0641a1-f554-4769-a864-314c46a80f2e');
    const db = createClient('https://hkoxhourxwlddgsfdgws.supabase.co', env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } });
    const login = await db.auth.signInWithPassword({ email: env.VITE_AUDIT_USER, password: env.VITE_AUDIT_PASS });
    if (login.error) throw new Error('Read-only order audit authentication failed.');
    const { data: candidate, error } = await db.from('orders').select('order_data').eq('id', 'dc0641a1-f554-4769-a864-314c46a80f2e').single();
    if (error || !candidate?.order_data?.customerData?.fullName) throw new Error('Real order customer unavailable.');
    await page.getByPlaceholder('Buscar pedido pelo nome do cliente...', { exact: true }).fill(candidate.order_data.customerData.fullName);
    await knownOrder.first().waitFor();
    console.log(JSON.stringify({ stage: 'candidate', orderNumber: '3474', visible: await knownOrder.count() > 0 }));
    console.log(JSON.stringify({ stage: 'order-actions', buttons: await knownOrder.first().locator('button').evaluateAll(
      (buttons) => buttons.map((button) => ({ text: button.textContent?.trim(), title: button.title, label: button.getAttribute('aria-label') }))
    ) }));
    await knownOrder.first().getByTitle('Mais ações e opções de envio').click();
    await page.getByTitle('Abrir ações pós-venda').click();
    await page.getByRole('dialog', { name: 'Ações Pós-Venda' }).waitFor();
    console.log(JSON.stringify({ stage: 'available-post-sale-actions', buttons:
      await page.getByRole('dialog', { name: 'Ações Pós-Venda' }).getByRole('button').allTextContents() }));
    const action = page.getByRole('dialog', { name: 'Ações Pós-Venda' }).getByText('Emitir nota fiscal de saída', { exact: true });
    console.log(JSON.stringify({ stage: 'post-sale', emissionAction: await action.count() }));
    await action.click();
    await page.getByRole('heading', { name: 'Emitir nota fiscal de saída', exact: true }).waitFor();
    console.log(JSON.stringify({ stage: 'fiscal-modal', opened: true, homologation: await page.getByText('Homologação · teste sem valor fiscal', { exact: true }).count() > 0 }));
    if (!mode) {
      const documents = await db.from('nfe_documents').select('id,status,serie,numero_nfe')
        .eq('order_id', orderId).eq('ambiente', 2).eq('modelo', '55');
      if (documents.error) throw new Error('Read-only fiscal history unavailable.');
      if (documents.data.length) {
        await page.goto(`${baseUrl}/fiscal-documents`);
        await page.getByRole('heading', { name: 'Notas Fiscais (NF-e & NFC-e)', exact: true }).waitFor();
        for (const document of documents.data) {
          await page.getByPlaceholder('Buscar por número, chave de acesso, cliente ou CPF/CNPJ...', { exact: true })
            .fill(String(document.numero_nfe));
          const row = page.locator('tbody tr').filter({ has: page.getByText(`Série ${document.serie}`, { exact: true }) })
            .filter({ has: page.getByText(`#${String(document.numero_nfe).padStart(6, '0')}`, { exact: true }) });
          await row.waitFor();
          assert.equal(await row.count(), 1, 'Each HML intention must remain individually visible.');
          assert.equal(await row.locator('td').nth(5).getByText(document.status, { exact: true }).count(), 1);
        }
        console.log(JSON.stringify({ stage: 'fiscal-history-ui', attempts: documents.data.length,
          separateSeriesVisible: true, statusesMatchPersistence: true, emissionTriggered: false }));
      }
    }
    if (mode) {
      const keysResult = spawnSync('npx.cmd', ['--yes', 'supabase', 'projects', 'api-keys', '--project-ref', 'hkoxhourxwlddgsfdgws', '--output', 'json'],
        { shell: true, windowsHide: true, encoding: 'utf8', timeout: 60000 });
      if (keysResult.status !== 0) throw new Error('Operational audit authentication unavailable.');
      const serviceKey = JSON.parse(keysResult.stdout).find((key) => key.name === 'service_role')?.api_key;
      if (!serviceKey) throw new Error('Operational audit key unavailable.');
      const auditDb = createClient('https://hkoxhourxwlddgsfdgws.supabase.co', serviceKey, { auth: { persistSession: false } });
      const before = await captureOperationalState(auditDb, orderId);
      const existing = await auditDb.from('nfe_documents').select('id', { count: 'exact', head: true }).eq('order_id', orderId).eq('ambiente', 2);
      if (existing.error || existing.count !== 0) throw new Error('Original HML attempt exists; consult it before another UI emission.');
      const modal = page.getByRole('dialog', { name: 'Emitir nota fiscal de saída', exact: true });
      const submit = modal.getByRole('button', { name: /Emitir NF-e em Homologação/ });
      await submit.waitFor();
      await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some((b) => /Emitir NF-e em Homologação/.test(b.textContent) && !b.disabled));
      const fields = { ncm: 'NCM', cfop: 'CFOP', origem: 'Origem fiscal', cest: 'CEST', csosn: 'CSOSN' };
      await modal.getByTitle('Ver / editar CFOP, CSOSN, Origem e CEST', { exact: true }).first().click();
      const selected = {};
      for (const [key, label] of Object.entries(fields)) selected[key] = await modal.getByLabel(label, { exact: true }).first().inputValue();
      assert.equal(selected.ncm, '94034000');
      assert.equal(selected.cfop, '5102');
      assert.match(selected.csosn, /^(102|103|300|400)$/);
      const responsePromise = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/nfe/emit' && r.request().method() === 'POST', { timeout: 150000 });
      await submit.click();
      const response = await responsePromise;
      const result = await response.json();
      assert.deepEqual(payload.itemFiscalSelections, { '1': selected });
      console.log(JSON.stringify({ stage: 'employee-emission', orderNumber: '3474', environment: 2,
        fieldsMatchPayload: true, httpStatus: response.status(), success: result.success, code: result.code,
        blockers: result.blockers, configurationIssues: result.configurationIssues, cStat: result.cStat,
        xMotivo: result.xMotivo, numberReserved: result.numberReserved, sefazContacted: result.sefazContacted,
        protocolPresent: Boolean(result.protocolNumber), documentId: result.documentId }));
      const after = await captureOperationalState(auditDb, orderId);
      assert.deepEqual(after, before);
      console.log(JSON.stringify({ stage: 'operational-isolation', unchanged: true }));
      const documents = await auditDb.from('nfe_documents').select('id,status,ambiente,fiscal_snapshot_id,xml_nfe,xml_protocolo,numero_protocolo').eq('order_id', orderId).eq('ambiente', 2);
      if (documents.error) throw new Error('Persisted HML evidence unavailable.');
      for (const doc of documents.data) {
        const snapshot = await auditDb.from('nfe_fiscal_snapshots').select('snapshot_data').eq('id', doc.fiscal_snapshot_id).single();
        if (snapshot.error) throw new Error('Immutable fiscal evidence unavailable.');
        assert.deepEqual(snapshot.data.snapshot_data.emissionRequest.itemFiscalSelections, payload.itemFiscalSelections);
        const xml = doc.xml_nfe || '';
        for (const [field, tag] of Object.entries({ ncm: 'NCM', cfop: 'CFOP', origem: 'orig', cest: 'CEST', csosn: 'CSOSN' }))
          assert.equal(xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1] || '', selected[field]);
        assert.match(xml, /<tpAmb>2<\/tpAmb>/);
        console.log(JSON.stringify({ stage: 'persisted-xml', fieldsMatchPayload: true, environment: doc.ambiente,
          status: doc.status, protocolPresent: Boolean(doc.numero_protocolo) }));
        if (result.success) {
          assert.equal(doc.status, 'homologada');
          assert.ok(doc.numero_protocolo);
          assert.equal(doc.numero_protocolo, result.protocolNumber);
          assert.ok(doc.xml_protocolo?.includes(`<nProt>${doc.numero_protocolo}</nProt>`));
        }
      }
      if (!result.success) process.exitCode = 2;
    }
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error.message.replace(/(password|token)=[^\s]+/gi, '$1=[REDACTED]')); process.exitCode = 1; });
