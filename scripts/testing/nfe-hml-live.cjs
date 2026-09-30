// Existing real ERP order, NF-e 55 homologation only. Never creates commercial data.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const assert = require('node:assert/strict');
const { captureOperationalState: captureOrderState } = require('./nfe-operational-audit.cjs');

const ref = 'hkoxhourxwlddgsfdgws';
const url = `https://${ref}.supabase.co`;
function cli(args, input) {
  const child = spawnSync('npx.cmd', args, { shell: true, input, encoding: 'utf8',
    windowsHide: true, timeout: 180000, maxBuffer: 2 * 1024 * 1024 });
  if (child.status !== 0) throw new Error('CLI operation failed; no credentials or payload were logged.');
  return child.stdout;
}
async function main() {
  const [deployment, envPath, mode = 'check', existingOrderId, existingRequestId] = process.argv.slice(2);
  if (!/^https:\/\/morantehub-[a-z0-9-]+\.vercel\.app$/.test(deployment || ''))
    throw new Error('Use a verified MoranteHub deployment URL.');
  const env = dotenv.parse(fs.readFileSync(envPath));
  if (!env.VITE_AUDIT_USER || !env.VITE_AUDIT_PASS || !env.VITE_SUPABASE_ANON_KEY)
    throw new Error('Configured fiscal audit login is unavailable.');
  const operator = createClient(url, env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: login, error: authError } = await operator.auth.signInWithPassword({
    email: env.VITE_AUDIT_USER, password: env.VITE_AUDIT_PASS });
  if (authError || !login.session) throw new Error('Fiscal audit login failed.');
  const token = login.session.access_token;
  function request(path, body) {
    const config = `write-out = "\\nHTTP_STATUS:%{http_code}"\nheader = "Authorization: Bearer ${token}"\n` +
      'header = "Content-Type: application/json"\n' +
      (body ? `request = "POST"\ndata = ${JSON.stringify(JSON.stringify(body))}\n` : '');
    const output = cli(['--yes', 'vercel', 'curl', path, '--deployment', deployment,
      '--', '--config', '-', '--silent'], config);
    const status = output.match(/HTTP_STATUS:(\d+)\s*$/)?.[1] || 'unknown';
    try { return { ...JSON.parse(output.replace(/\nHTTP_STATUS:\d+\s*$/, '')), httpStatus: Number(status) }; }
    catch { throw new Error(`Deployment did not return fiscal API JSON (HTTP ${status}).`); }
  }
  const defaults = request('/api/nfe/item-defaults');
  if (!defaults.success || defaults.configuration?.environment !== 2 ||
      defaults.configuration?.productionApproved !== false)
    throw new Error(`HML backend unavailable: ${defaults.error || 'scope validation failed'}`);
  console.log(JSON.stringify({ stage: 'backend', csosn: defaults.configuration.csosn, environment: 2,
    configurationIssues: defaults.readiness?.configurationIssues }));
  if (mode === 'check') {
    assert.equal(defaults.httpStatus, 200);
    for (const route of ['emit', 'consult']) {
      const rejected = request(`/api/nfe/${route}`, {});
      assert.equal(rejected.httpStatus, 400, `${route}: invalid command must fail before emission`);
      console.log(JSON.stringify({ stage: 'endpoint', route, httpStatus: 400, initialized: true }));
    }
    return;
  }
  if (!['emit', 'reconcile', 'repeat', 'consult'].includes(mode)) throw new Error('Invalid HML action.');
  const keys = JSON.parse(cli(['--yes', 'supabase', 'projects', 'api-keys', '--project-ref', ref, '--output', 'json']));
  const serviceKey = keys.find((key) => key.name === 'service_role')?.api_key;
  if (!serviceKey) throw new Error('Backend DB key unavailable.');
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  async function captureOperationalState(id) {
    return captureOrderState(db, id);
  }
  const orderId = existingOrderId;
  const emissionRequestId = existingRequestId || (mode === 'emit' ? crypto.randomUUID() : undefined);
  if (!/^[0-9a-f-]{36}$/i.test(orderId || '') || !emissionRequestId)
    throw new Error('Provide the exact existing real order ID and original emission request for retries.');
  const { data: order, error: orderError } = await db.from('orders')
    .select('id,order_type,status,deleted,order_data').eq('id', orderId).single();
  if (orderError || order.deleted === true || order.order_type !== 'sale' ||
      ['draft', 'cancelled', 'cancelado'].includes(order.status) ||
      order.order_data?.testRunId || order.order_data?.fiscalScenario === 'HML_TECHNICAL_V1')
    throw new Error('An existing eligible real sale is required; synthetic orders are refused.');
  console.log(JSON.stringify({ stage: 'order', orderId, orderNumber: order.order_data?.orderNumber,
    emissionRequestId, environment: 2 }));
  const before = await captureOperationalState(orderId);
  let prior;
  if (mode === 'repeat' || mode === 'consult') {
    const { data, error } = await db.from('nfe_documents')
      .select('id,xml_nfe,numero_protocolo,numero_nfe,serie,status')
      .eq('order_id', orderId).single();
    if (error) throw new Error('Original HML document is unavailable.');
    prior = data;
  }
  const result = mode === 'consult'
    ? request('/api/nfe/consult', { documentId: prior.id })
    : request('/api/nfe/emit', { orderId, emissionRequestId, environment: 2 });
  console.log(JSON.stringify({ stage: 'emission', success: result.success, code: result.code,
    error: result.error, blockers: result.blockers, configurationIssues: result.configurationIssues,
    transportDiagnostic: result.transportDiagnostic,
    pending: result.pending, documentId: result.documentId,
    environment: result.environment, nfeNumber: result.nfeNumber, series: result.series,
    cStat: result.cStat, xMotivo: result.xMotivo, protocolPresent: Boolean(result.protocolNumber),
    xmlPresent: Boolean(result.signedXml), numberReserved: result.numberReserved, sefazContacted: result.sefazContacted }));
  const { data: docs, error } = await db.from('nfe_documents').select('id,status,modelo,ambiente,numero_nfe,serie,xml_nfe,xml_protocolo,numero_protocolo,hml_response_history')
    .eq('order_id', orderId);
  if (error) throw new Error('Could not verify the persisted attempt.');
  console.log(JSON.stringify({ stage: 'persistence', count: docs.length, documents: docs.map((doc) => ({
    id: doc.id, status: doc.status, model: doc.modelo, environment: doc.ambiente,
    number: doc.numero_nfe, series: doc.serie, protocolPresent: Boolean(doc.numero_protocolo),
    icmsGroup: (doc.xml_nfe || '').match(/<(ICMSSN\d+)>/)?.[1],
    csosn: (doc.xml_nfe || '').match(/<CSOSN>(\d+)<\/CSOSN>/)?.[1],
    origin: (doc.xml_nfe || '').match(/<orig>(\d)<\/orig>/)?.[1],
  })) }));
  const after = await captureOperationalState(orderId);
  assert.deepEqual(after, before, 'Operational state changed during the HML test; reconcile without reversing business facts.');
  console.log(JSON.stringify({ stage: 'isolation', operationalStateUnchanged: true }));
  if (result.success) {
    assert.equal(docs.length, 1, 'Authorization must persist exactly one document.');
    const saved = docs[0];
    assert.equal(saved.status, 'homologada');
    assert.equal(saved.ambiente, 2);
    assert.equal(saved.modelo, '55');
    assert.ok(saved.numero_protocolo);
    assert.equal(saved.numero_protocolo, result.protocolNumber);
    assert.ok(saved.xml_protocolo?.includes(`<nProt>${saved.numero_protocolo}</nProt>`));
    assert.ok(saved.hml_response_history?.length > 0);
    assert.match(saved.xml_nfe, /<tpAmb>2<\/tpAmb>/);
    assert.match(saved.xml_nfe, /<Signature\b/);
    const { count, error: itemError } = await db.from('nfe_document_items')
      .select('id', { count: 'exact', head: true }).eq('document_id', saved.id);
    if (itemError) throw new Error('Could not verify the authorized item snapshot.');
    assert.equal(count, 1, 'Authorized item snapshot must be stored atomically.');
    if (prior) {
      assert.equal(saved.id, prior.id);
      assert.equal(saved.xml_nfe, prior.xml_nfe);
      assert.equal(saved.numero_protocolo, prior.numero_protocolo);
      assert.equal(saved.numero_nfe, prior.numero_nfe);
      assert.equal(saved.serie, prior.serie);
    }
    console.log(JSON.stringify({ stage: 'verified', authorized: true,
      persistedProtocolMatches: true, originalDocumentPreserved: Boolean(prior) }));
  } else process.exitCode = 2;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
