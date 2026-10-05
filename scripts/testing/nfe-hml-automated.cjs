// End-to-end NF-e 55 homologation test. It creates one isolated TEST_AUT fixture,
// submits exactly once, consults that same document, and preserves all fiscal evidence.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { inspectReadiness } = require('./nfe-hml-readiness.cjs');
const { loadErpServices } = require('./nfe-hml-erp-services.cjs');

const root = path.resolve(__dirname, '..', '..');
const envPath = path.join(root, '.env.local');
const baseUrl = 'http://127.0.0.1:3038';
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const supabaseUrlFallback = 'https://hkoxhourxwlddgsfdgws.supabase.co';

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  throw error;
}

function loadEnvironment() {
  if (!fs.existsSync(envPath)) fail('PRECHECK_VERCEL_ENV');
  const env = dotenv.parse(fs.readFileSync(envPath));
  const { readiness, failure } = inspectReadiness(env);
  for (const [key, value] of Object.entries(readiness)) process.stdout.write(`${key}=${value}\n`);
  if (failure) fail(failure);
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  process.stdout.write('Readiness local aprovada.\n');
  return env;
}

function run(command, args, options = {}) {
  const child = spawnSync(command, args, {
    cwd: root, env: process.env, encoding: 'utf8', windowsHide: true,
    timeout: options.timeout || 180000, maxBuffer: 2 * 1024 * 1024,
    shell: process.platform === 'win32', stdio: options.stdio || 'pipe',
  });
  if (child.error || child.status !== 0) fail(options.code || 'LOCAL_BUILD_FAILED',
    options.message || 'A etapa local falhou; saída sensível foi suprimida.');
}

function startServer() {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(executable, ['-y', 'vercel', 'dev', '--listen', '3038', '--yes'], {
    cwd: root, env: process.env, stdio: 'ignore', shell: process.platform === 'win32', windowsHide: true,
  });
  child.on('error', () => {});
  return child;
}

function stopServer(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'],
      { windowsHide: true, stdio: 'ignore', timeout: 10000 });
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
  }
}

async function waitForApi(token, child) {
  const deadline = Date.now() + 600000;
  let lastStatus = 0;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) fail('LOCAL_API_START_FAILED');
    try {
      const response = await fetch(`${baseUrl}/api/nfe/item-defaults`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
      });
      lastStatus = response.status;
      if (response.ok) {
        const body = await response.json();
        assert.equal(body.success, true);
        assert.equal(body.configuration?.environment, 2);
        assert.equal(body.configuration?.productionApproved, false);
        assert.deepEqual(body.readiness?.configurationIssues, []);
        process.stdout.write('backendReady=true\n');
        return body.configuration;
      }
      if (![404, 502, 503].includes(response.status)) fail('LOCAL_API_READINESS',
        `API fiscal não aprovada (HTTP ${response.status}).`);
    } catch (error) {
      if (error.code === 'LOCAL_API_READINESS') throw error;
    }
    await timeout(1200);
  }
  fail('LOCAL_API_TIMEOUT', `API fiscal não ficou pronta (último HTTP ${lastStatus || 'indisponível'}).`);
}

async function authenticatedRequest(token, route, body, requestTimeout = 240000) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(requestTimeout),
  });
  let payload;
  try { payload = await response.json(); }
  catch { fail('API_INVALID_RESPONSE', `${route} não retornou JSON.`); }
  return { status: response.status, body: payload };
}

function makeCpf() {
  const base = Array.from({ length: 9 }, () => crypto.randomInt(0, 10));
  const digit = (values, start) => {
    const sum = values.reduce((total, value, index) => total + value * (start - index), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  base.push(digit(base, 10));
  base.push(digit(base, 11));
  const cpf = base.join('');
  return /^(\d)\1{10}$/.test(cpf) ? makeCpf() : cpf;
}

function makeFixture(orderId, recipient, product, orderIndex) {
  const price = Math.round(Number(product.unitPrice) * 100) / 100;
  if (!Number.isFinite(price) || price <= 0) fail('HML_CATALOG_PRODUCT_INVALID');
  const item = {
    productId: product.id,
    isTemporaryProduct: false,
    orderItemId: crypto.randomUUID(),
    variationId: product.variations?.[0]?.id,
    itemType: 'product',
    description: product.name,
    quantity: 1,
    unitPrice: price,
    unitDiscount: 0,
    fiscal: product.fiscal,
  };
  const testRunId = `TEST_AUT_${orderId}`;
  return {
    orderNumber: orderIndex,
    orderIndex,
    orderType: 'sale',
    status: 'scheduled',
    deleted: false,
    date: new Date().toISOString(),
    observation: testRunId,
    items: [item],
    testRunId: orderId,
    test_run_id: testRunId,
    is_test: true,
    test_environment: 'homologation',
    payments: [{ id: crypto.randomUUID(), method: 'pix', amount: price }],
    itemsSummary: { itemsSubtotal: price, totalFixedDiscount: 0, totalItemsCost: 0 },
    paymentsSummary: { totalOrderValue: price, totalPaid: price, remainingAmount: 0 },
    customerData: { id: recipient.id, fullName: recipient.fullName, cpfCnpj: recipient.cpfCnpj,
      phone: recipient.phone, fullAddress: recipient.fullAddress },
      shipping: {
        deliveryMethod: 'pickup',
        value: 0,
        deliveryAddress: { street: 'Rua Teste', number: '10', neighborhood: 'Centro',
          city: 'Colombo', state: 'PR', zipCode: '83410270' },
      },
  };
}

function assertNormalSaleFixture(orderId, fixture) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);
  if (!isUuid || fixture.deleted !== false || fixture.status !== 'scheduled' ||
      fixture.fiscalScenario !== undefined ||
      fixture.test_environment !== 'homologation' ||
      fixture.is_test !== true || fixture.testRunId !== orderId ||
      fixture.test_run_id !== `TEST_AUT_${orderId}` || fixture.orderType !== 'sale' ||
      !fixture.customerData?.id || !fixture.items?.[0]?.productId ||
      !Number.isInteger(fixture.orderIndex) || fixture.orderIndex < 800000 || fixture.orderIndex > 999999)
    fail('NORMAL_HML_FIXTURE_NOT_ISOLATED',
      'Fixture HML não satisfaz os marcadores explícitos da venda normal.');
}

async function createSyntheticRecipient(services, orderId) {
  const fullName = `TEST_AUT_${orderId} DESTINATARIO HML`;
  const address = { street: 'Rua Teste', number: '10', neighborhood: 'Centro',
    city: 'Colombo', state: 'PR', zipCode: '83410270' };
  const person = { personType: 'PF', type: 'customers', fullName,
    cpfCnpj: makeCpf(), phone: '', noPhone: true,
    observation: `TEST_AUT_${orderId}`, active: true, deleted: false,
    fullAddress: address };
  return services.savePerson('customers', person);
}

async function createSyntheticProduct(operator, services, orderId, csosn) {
  const { data: ncm, error } = await operator.from('ncms')
    .select('code,official_description,active,is_active,start_date,end_date').eq('code', '94035000').single();
  const today = new Date().toISOString().slice(0, 10);
  if (error || !ncm?.active || !ncm.is_active || ncm.start_date > today || ncm.end_date < today)
    fail('HML_NCM_NOT_ACTIVE');
  const testRunId = `TEST_AUT_${orderId}`;
  const product = { id: crypto.randomUUID(), code: testRunId,
    name: `${testRunId} CRIADO-MUDO DE MADEIRA HML`,
    description: `${testRunId} CRIADO-MUDO DE MADEIRA PARA QUARTO`,
    unitPrice: 1, stock: 1, costPrice: 0, unit: 'UN', itemType: 'product',
    active: true, deleted: false, isDraft: false, status: 'hidden',
    launchInitialStock: false,
    fiscal: { ncm: ncm.code, ncmDescription: ncm.official_description, cfop: '5102',
      origin: '0', csosn, cest: '', test_run_id: testRunId },
  };
  product.id = await services.saveProduct(product, true);
  return product;
}

async function verifyFixture(operator, orderId, fixture) {
  const { data: saved, error } = await operator.from('orders')
    .select('id,status,deleted,order_type,order_data').eq('id', orderId).single();
  if (error) fail('FIXTURE_READ_FAILED');
  assertNormalSaleFixture(saved.id, { ...saved.order_data, deleted: saved.deleted, status: saved.status });
  assert.equal(saved.order_type, 'sale');
  assert.equal(saved.order_data.customerData.id, fixture.customerData.id);
  assert.equal(saved.order_data.items[0].productId, fixture.items[0].productId);
  const excluded = await operator.rpc('is_nfe_hml_test_order', {
    p_id: saved.id, p_status: saved.status, p_deleted: saved.deleted, p_data: saved.order_data,
  });
  if (excluded.error || excluded.data !== true) fail('FIXTURE_DASHBOARD_ISOLATION_FAILED');
  const { data: lines, error: linesError } = await operator.from('order_items')
    .select('product_id').eq('order_id', orderId);
  if (linesError) fail('FIXTURE_ITEMS_READ_FAILED');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].product_id, fixture.items[0].productId);
  process.stdout.write('Customer Fixture: OK\nProduct Fixture: OK\nOrder Fixture: OK\nDashboard exclusion: OK\n');
}

async function findPriorAttempt(db, emissionRequestId) {
  const [documents, snapshots] = await Promise.all([
    db.from('nfe_documents').select('id,order_id,modelo,ambiente,status')
      .eq('emission_request_id', emissionRequestId),
    db.from('nfe_fiscal_snapshots').select('id,order_id,requested_model,environment')
      .eq('emission_request_id', emissionRequestId),
  ]);
  if (documents.error || snapshots.error) fail('ATTEMPT_PRECHECK_FAILED',
    'Não foi possível verificar se a tentativa fiscal já existe. Nenhuma emissão foi iniciada.');
  return { documents: documents.data || [], snapshots: snapshots.data || [] };
}

async function reconcilePriorAttempt(token, attempt) {
  if (attempt.documents.length !== 1)
    fail('PREEXISTING_ATTEMPT_AMBIGUOUS',
      'A emissionRequestId já tem mais de um documento. Nenhuma transmissão foi iniciada.');
  const prior = attempt.documents[0];
  if (prior.modelo !== '55' || prior.ambiente !== 2)
    fail('PREEXISTING_ATTEMPT_WRONG_ENVIRONMENT',
      'A tentativa existente não é NF-e 55 HML. Nenhuma transmissão foi iniciada.');
  process.stdout.write('emissionSubmissions=0\n');
  const reconciled = await authenticatedRequest(token, '/api/nfe/consult', { documentId: prior.id });
  process.stdout.write(`priorAttemptConsulted=${reconciled.status === 200}\n`);
  if (reconciled.status !== 200 || reconciled.body.success !== true)
    fail('PREEXISTING_ATTEMPT_UNRESOLVED',
      'Tentativa anterior consultada, mas ainda sem confirmação. Nenhuma retransmissão foi iniciada.');
  fail('PREEXISTING_ATTEMPT_RECONCILED',
    'Tentativa anterior reconciliada; esta execução não criou fixture nem transmitiu novamente.');
}

async function main() {
  const env = loadEnvironment();
  const supaUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || supabaseUrlFallback;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  const secret = env.SUPABASE_SECRET_KEY;
  const operator = createClient(supaUrl, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: login, error: loginError } = await operator.auth.signInWithPassword({
    email: env.NFE_HML_TEST_OPERATOR_EMAIL, password: env.NFE_HML_TEST_OPERATOR_PASSWORD,
  });
  if (loginError || !login.session) fail('PRECHECK_OPERATOR_AUTH', 'Credencial inválida ou usuário desativado.');
  const token = login.session.access_token;
  const services = await loadErpServices(operator);
  const { data: profile, error: profileError } = await operator.from('profiles')
    .select('role,roles').eq('id', login.user.id).maybeSingle();
  if (profileError || !services.hasFiscalOperationRole(profile))
    fail('PRECHECK_OPERATOR_AUTH', 'Permissão fiscal ausente.');
  process.stdout.write('operatorAuth=true\nOperator Auth: OK\n');
  // Backend secret is used only for read-only evidence. Fixture writes use operator + ERP services/RPC.
  const db = createClient(supaUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  run('npm', ['run', 'build:fiscal', '--prefix', 'erp'], { code: 'FISCAL_BUILD_FAILED' });
  process.stdout.write('fiscalBuild=PASS\n');
  const server = startServer();
  try {
    const configuration = await waitForApi(token, server);
    const orderId = crypto.randomUUID();
    const emissionRequestId = crypto.randomUUID();
    const testRunId = `TEST_AUT_${orderId}`;
    process.stdout.write(`test_run_id=${testRunId}\norderId=${orderId}\nemissionRequestId=${emissionRequestId}\n`);
    const beforeFixture = await findPriorAttempt(db, emissionRequestId);
    if (beforeFixture.documents.length)
      await reconcilePriorAttempt(token, beforeFixture);
    if (beforeFixture.snapshots.length)
      fail('PREEXISTING_ATTEMPT_RECONCILIATION_REQUIRED',
        'A emissionRequestId já tem snapshot sem documento consultável. Nenhum pedido foi criado ou transmitido.');
    const recipient = await createSyntheticRecipient(services, orderId);
    const product = await createSyntheticProduct(operator, services, orderId, configuration.csosn);
    // Use the already reserved TEST_AUT range, without advancing the operational sale sequence.
    const orderIndex = crypto.randomInt(800000, 1000000);
    const fixture = makeFixture(orderId, recipient, product, orderIndex);
    assertNormalSaleFixture(orderId, fixture);
    const { data: existing, error: existingError } = await db.from('orders').select('id').eq('id', orderId).maybeSingle();
    if (existingError || existing) fail('FIXTURE_ID_COLLISION');
    const { data: createdOrder, error: insertError } = await operator.rpc('create_order_with_inventory_transaction', {
      p_order_id: orderId, p_order_payload: services.buildOrderPersistencePayload(fixture),
      p_items: fixture.items, p_payments: fixture.payments,
    });
    if (insertError) fail('FIXTURE_CREATE_FAILED', `A RPC do ERP recusou a fixture (${insertError.code || 'erro'}).`);
    assert.equal(createdOrder?.id, orderId);
    assert.equal(createdOrder?.order_index, orderIndex);
    await verifyFixture(operator, orderId, fixture);

    const emissionBody = {
      orderId, emissionRequestId, environment: 2,
      itemCsosnOverrides: { '1': configuration.csosn },
      itemFiscalSelections: { '1': { ncm: product.fiscal.ncm, cfop: '5102', origem: '0', cest: '', csosn: configuration.csosn } },
    };
    const immediatelyBeforeSubmit = await findPriorAttempt(db, emissionRequestId);
    if (immediatelyBeforeSubmit.documents.length)
      await reconcilePriorAttempt(token, immediatelyBeforeSubmit);
    if (immediatelyBeforeSubmit.snapshots.length)
      fail('PREEXISTING_SNAPSHOT_RECONCILIATION_REQUIRED',
        'Já existe snapshot para esta emissionRequestId sem documento consultável. Nenhum POST foi realizado.');
    process.stdout.write('emissionSubmissions=1\n');
    let emission;
    try {
      emission = await authenticatedRequest(token, '/api/nfe/emit', emissionBody);
      console.log('EMISSION_HTTP_STATUS:', emission.status);
      console.log('EMISSION_HTTP_BODY:', JSON.stringify(emission.body));
    } catch (e) {
      console.log('EMISSION_EXCEPTION:', e);
      emission = { status: 0, body: { success: false, pending: true } };
    }
    const { data: attempts, error: attemptError } = await db.from('nfe_documents')
      .select('id,status,modelo,ambiente,numero_nfe,serie,chave_acesso,numero_protocolo,xml_nfe,xml_protocolo,fiscal_snapshot_id,emission_request_id')
      .eq('order_id', orderId).eq('ambiente', 2).eq('modelo', '55');
    if (attemptError) fail('ATTEMPT_LOOKUP_FAILED');
    assert.equal(attempts.length, 1, 'Uma submissão deve criar no máximo um documento para esta fixture.');
    const saved = attempts[0];
    assert.equal(saved.emission_request_id, emissionRequestId);
    if (emission.body.documentId) assert.equal(emission.body.documentId, saved.id);
    process.stdout.write(`emissionResponseHttp=${emission.status || 'ambiguous'}\n`);

    const consultation = await authenticatedRequest(token, '/api/nfe/consult', { documentId: saved.id });
    const consulted = consultation.body;
    assert.equal(consultation.status, 200, 'Consulta direta à SEFAZ HML deve confirmar autorização.');
    assert.equal(consulted.success, true);
    assert.equal(consulted.state, 'authorized');
    assert.equal(consulted.sefazConsulted, true);
    assert.equal(String(consulted.cStat), '100');
    assert.ok(consulted.protocolNumber);

    const { data: verified, error: verifiedError } = await db.from('nfe_documents')
      .select('id,status,modelo,ambiente,numero_nfe,serie,chave_acesso,numero_protocolo,xml_nfe,xml_protocolo,fiscal_snapshot_id,emission_request_id,fiscal_ruleset_version')
      .eq('id', saved.id).single();
    if (verifiedError) fail('DOCUMENT_READ_FAILED');
    assert.equal(verified.status, 'homologada');
    assert.equal(verified.modelo, '55');
    assert.equal(verified.ambiente, 2);
    assert.equal(String(verified.numero_protocolo), String(consulted.protocolNumber));
    assert.match(verified.chave_acesso || '', /^\d{44}$/);
    assert.ok(verified.xml_nfe?.includes(`Id="NFe${verified.chave_acesso}"`));
    assert.match(verified.xml_nfe, /<tpAmb>2<\/tpAmb>/);
    assert.match(verified.xml_nfe, /<Signature\b/);
    assert.ok(verified.xml_protocolo?.includes(`<nProt>${verified.numero_protocolo}</nProt>`));
    assert.match(verified.xml_nfe, /<NCM>94035000<\/NCM>/);
    assert.match(verified.xml_nfe, /<CFOP>5102<\/CFOP>/);
    assert.match(verified.xml_nfe, /<orig>0<\/orig>/);
    assert.ok(verified.xml_nfe.includes(`<CSOSN>${configuration.csosn}</CSOSN>`));
    assert.doesNotMatch(verified.xml_nfe, /<CEST>\s*[^<]+<\/CEST>/);
    assert.ok(verified.xml_protocolo?.includes(`<chNFe>${verified.chave_acesso}</chNFe>`));
    assert.equal(verified.fiscal_ruleset_version, 'HML_NORMAL_SALE_V1');
    const { SignedXml } = require('xml-crypto');
    const der = verified.xml_nfe.match(/<X509Certificate>([^<]+)<\/X509Certificate>/)?.[1];
    assert.ok(der, 'O XML deve preservar o certificado da assinatura.');
    const certificate = new crypto.X509Certificate(Buffer.from(der, 'base64'));
    const verifier = new SignedXml({ publicCert: certificate.toString(), getCertFromKeyInfo: () => certificate.toString() });
    verifier.loadSignature(verified.xml_nfe.match(/<Signature\b[\s\S]*?<\/Signature>/)?.[0] || '');
    assert.equal(verifier.checkSignature(verified.xml_nfe), true, 'Assinatura criptográfica inválida.');

    const { count: itemCount, error: itemError } = await db.from('nfe_document_items')
      .select('id', { count: 'exact', head: true }).eq('document_id', verified.id);
    if (itemError) fail('DOCUMENT_ITEM_READ_FAILED');
    assert.equal(itemCount, 1, 'A NF-e autorizada deve preservar o item fiscal persistido.');

    const { data: snapshot, error: snapshotError } = await db.from('nfe_fiscal_snapshots')
      .select('snapshot_data,environment,requested_model,emission_request_id')
      .eq('id', verified.fiscal_snapshot_id).single();
    if (snapshotError) fail('SNAPSHOT_READ_FAILED');
    assert.equal(snapshot.environment, 2);
    assert.equal(snapshot.requested_model, '55');
    assert.equal(snapshot.emission_request_id, emissionRequestId);
    const snapshotItem = snapshot.snapshot_data?.order?.data?.items?.[0];
    assert.equal(snapshotItem?.productId, product.id);
    assert.equal(snapshotItem?.quantity, 1);
    assert.equal(snapshotItem?.unitPrice, 1);
    assert.equal(snapshot.snapshot_data?.order?.data?.customerData?.id, recipient.id);
    const selection = snapshot.snapshot_data?.emissionRequest?.itemFiscalSelections?.['1'];
    assert.equal(selection?.ncm, '94035000');
    assert.equal(selection?.cfop, '5102');
    assert.equal(selection?.origem, '0');
    assert.equal(selection?.cest, '');
    assert.equal(snapshot.snapshot_data?.emissionRequest?.itemCsosnOverrides?.['1'], configuration.csosn);
    await verifyFixture(operator, orderId, fixture);

    process.stdout.write(JSON.stringify({
      result: 'PASS', model: 55, environment: 2, nfeNumber: verified.numero_nfe,
      series: verified.serie, cStat: String(consulted.cStat), protocolPresent: true,
      accessKeyValid: true, signedXmlValid: true, snapshotValid: true,
      customerId: recipient.id, productId: product.id, orderId, test_run_id: testRunId,
      operatorAuthenticated: true, dashboardExcluded: true,
    }) + '\n');
    process.stdout.write('fixtureAndFiscalEvidence=preserved\n');
    process.stdout.write('NF-e HML E2E: PASS\nEnvironment: Development\ntpAmb: 2\nSEFAZ: cStat 100\nXML: OK\nSnapshot: OK\nDatabase: OK\n');
  } finally {
    stopServer(server);
  }
}

if (require.main === module) {
  process.stderr.write('Emissão HML por CLI foi desativada conforme testes-seguros-erp. Use a interface do ERP; npm run test:nfe:hml executa somente probes e consultas.\n');
  process.exitCode = 1;
}
module.exports = { makeFixture, assertNormalSaleFixture, makeCpf, createSyntheticRecipient,
  createSyntheticProduct, verifyFixture };
