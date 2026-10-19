// Local UI audit only. Never import this harness into a fiscal handler or deploy it.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { createHash } = require('node:crypto');

function assertOwnedTarget(document, draft, order, expected) {
  const artifact = order?.order_data?.testArtifact;
  if (document?.id !== expected.documentId || document.ambiente !== 2 ||
      !['homologada', 'autorizada'].includes(document.status) || document.document_type !== 'return' ||
      draft?.document_id !== document.id || draft.environment !== 2 || draft.status !== 'authorized' ||
      draft.operation_kind !== 'return' || draft.return_order_id !== order?.id ||
      order?.order_data?.is_test !== true || artifact?.is_test !== true ||
      artifact.runId !== expected.runId || artifact.ownerId !== expected.ownerId) {
    throw new Error('OWNED_AUTHORIZED_HML_RETURN_REQUIRED');
  }
}

function assertOwnedAuthorizationTarget(source, draft, order, expected) {
  const artifact = order?.order_data?.testArtifact;
  if (draft?.id !== expected.documentId || draft.environment !== 2 || draft.status !== 'ready' ||
      draft.operation_kind !== 'return' || draft.document_id || draft.access_key || draft.signed_xml ||
      draft.return_order_id !== order?.id || source?.id !== draft.original_document_id ||
      source.ambiente !== 2 || !['homologada', 'autorizada'].includes(source.status) ||
      order?.status !== 'fulfilled' || order.order_data?.returnStockProcessed !== true ||
      order.order_data?.is_test !== true || artifact?.is_test !== true ||
      artifact.runId !== expected.runId || artifact.ownerId !== expected.ownerId) {
    throw new Error('OWNED_READY_HML_RETURN_REQUIRED');
  }
}

function isConfirmedHmlAuthorization(body, draftId) {
  if (body?.p_draft_id !== draftId || body.p_document_id !== draftId || body.p_status !== 'homologada' ||
      !/^[0-9A-Z]{44}$/.test(body.p_access_key || '') || !/^\d{15}$/.test(body.p_protocol_number || '')) return false;
  try {
    const { DOMParser } = require('../../erp/node_modules/@xmldom/xmldom');
    const parse = xml => {
      if (typeof xml !== 'string' || /<!DOCTYPE/i.test(xml)) throw new Error('INVALID_XML');
      return new DOMParser({ onError() { throw new Error('INVALID_XML'); } }).parseFromString(xml, 'text/xml');
    };
    const namespace = 'http://www.portalfiscal.inf.br/nfe';
    const protocols = parse(body.p_sefaz_response_xml).getElementsByTagNameNS(namespace, 'infProt');
    if (protocols.length !== 1) return false;
    const value = tag => protocols[0].getElementsByTagNameNS(namespace, tag)[0]?.textContent;
    const signed = parse(body.p_signed_xml);
    const identities = signed.getElementsByTagNameNS(namespace, 'infNFe');
    const environments = signed.getElementsByTagNameNS(namespace, 'tpAmb');
    return value('cStat') === '100' && value('tpAmb') === '2' &&
      value('chNFe') === body.p_access_key && value('nProt') === body.p_protocol_number &&
      identities.length === 1 && identities[0].getAttribute('Id') === `NFe${body.p_access_key}` &&
      environments.length === 1 && environments[0].textContent === '2';
  } catch { return false; }
}

function createPersistenceFaultFetch(originalFetch, { origin, documentId, mode = 'cancellation', onWrite = () => {}, onPrepared = () => {} }) {
  let failed = false;
  return async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const rpc = mode === 'preparation' ? 'prepare_nfe_operation_attempt' : mode === 'authorization' ? 'persist_authorized_nfe_operation_draft' : 'persist_nfe_cancellation_result';
    if (url.origin === origin && url.pathname === `/rest/v1/rpc/${rpc}` && typeof init?.body === 'string') {
      let body;
      try { body = JSON.parse(init.body); } catch { /* Forward untouched. */ }
      if (mode === 'preparation' && body?.p_draft_id === documentId) {
        if (!/^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/.test(body.p_access_key || '') ||
            !body.p_signed_xml?.includes('<tpAmb>2</tpAmb>') || !body.p_signed_xml?.includes(`Id="NFe${body.p_access_key}"`)) {
          throw new Error('OWNED_HML_PREPARATION_REQUIRED');
        }
        onPrepared(body);
        onWrite({ at: new Date().toISOString(), injected: true, phase: 'preparation-captured-before-rpc',
          documentId, environment: 2, accessKey: body.p_access_key,
          signedXmlHash: createHash('sha256').update(body.p_signed_xml).digest('hex') });
        return new Response(JSON.stringify({ code: 'NFH_PREPARATION_CAPTURED', message: 'Controlled local audit: preparation captured before PostgreSQL; no transmission.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
      const matches = mode === 'authorization' ? isConfirmedHmlAuthorization(body, documentId) :
        body?.p_document_id === documentId && body.p_environment === 2 && body.p_status === 'registered' && ['135', '155'].includes(String(body.p_cstat));
      if (matches) {
        const inject = !failed;
        failed = true;
        onWrite({ at: new Date().toISOString(), injected: inject, documentId, eventId: body.p_event_id,
          cStat: mode === 'authorization' ? '100' : String(body.p_cstat), protocol: body.p_protocol_number || body.p_protocol,
          ...(mode === 'authorization' ? { draftId: body.p_draft_id, accessKey: body.p_access_key, signedXmlHash: createHash('sha256').update(body.p_signed_xml).digest('hex') } : {}),
          responseHash: createHash('sha256').update(body.p_sefaz_response_xml || body.p_response_xml || '').digest('hex') });
        if (inject) return new Response(JSON.stringify({ code: 'NFH_CONTROLLED_PERSISTENCE_FAILURE', message: 'Controlled local audit: this result was not sent to PostgreSQL.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return originalFetch(input, init);
  };
}

function createTransportFaultPost(originalPost, { sourceAccessKey, onEvent = () => {} }) {
  let hiddenAuthorization = null;
  let consultationBlocked = false;
  let transmissionStarted = false;
  const namespace = 'http://www.portalfiscal.inf.br/nfe';
  const { DOMParser } = require('../../erp/node_modules/@xmldom/xmldom');
  const parse = xml => {
    if (typeof xml !== 'string' || /<!DOCTYPE/i.test(xml)) throw new Error('INVALID_XML');
    return new DOMParser({ onError() { throw new Error('INVALID_XML'); } }).parseFromString(xml, 'text/xml');
  };
  const values = (doc, tag) => Array.from(doc.getElementsByTagNameNS(namespace, tag), node => node.textContent);
  const timeout = () => Object.assign(new Error('Controlled local HML transport interruption.'), { code: 'ETIMEDOUT' });
  return async (url, envelope, config) => {
    const endpoint = new URL(url);
    if (endpoint.origin !== 'https://homologacao.nfe.sefa.pr.gov.br') throw new Error('HML_55_ENDPOINT_REQUIRED');
    const payload = parse(envelope);
    if (values(payload, 'tpAmb').some(value => value !== '2')) throw new Error('HML_PAYLOAD_REQUIRED');
    const note = payload.getElementsByTagNameNS(namespace, 'infNFe');
    if (note.length === 1) {
      if (transmissionStarted || values(payload, 'mod').join() !== '55' ||
          values(payload, 'finNFe').join() !== '4' || values(payload, 'tpNF').join() !== '0' ||
          values(payload, 'chaveAcesso').join() !== sourceAccessKey) throw new Error('OWNED_SINGLE_RETURN_TRANSMISSION_REQUIRED');
      const accessKey = note[0].getAttribute('Id')?.replace(/^NFe/, '');
      if (!/^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/.test(accessKey || '')) throw new Error('HML_KEY_REQUIRED');
      transmissionStarted = true;
      onEvent({ at: new Date().toISOString(), phase: 'real-transmission-started', environment: 2, accessKey });
      const response = await originalPost(url, envelope, config);
      const reply = parse(response.data);
      const protocols = reply.getElementsByTagNameNS(namespace, 'infProt');
      if (protocols.length !== 1) return response;
      const protocol = protocols[0];
      const field = tag => protocol.getElementsByTagNameNS(namespace, tag)[0]?.textContent;
      if (field('cStat') !== '100' || field('tpAmb') !== '2' || field('chNFe') !== accessKey ||
          !/^\d{15}$/.test(field('nProt') || '')) return response;
      hiddenAuthorization = accessKey;
      onEvent({ at: new Date().toISOString(), phase: 'real-authorization-response-hidden',
        environment: 2, accessKey, cStat: '100', protocol: field('nProt'),
        responseHash: createHash('sha256').update(response.data).digest('hex') });
      throw timeout();
    }
    if (hiddenAuthorization &&
        values(payload, 'xServ').join() === 'CONSULTAR' && values(payload, 'chNFe').join() === hiddenAuthorization) {
      if (!consultationBlocked) {
        consultationBlocked = true;
        onEvent({ at: new Date().toISOString(), phase: 'immediate-consultation-outage', environment: 2, accessKey: hiddenAuthorization });
        throw timeout();
      }
      onEvent({ at: new Date().toISOString(), phase: 'recovery-consultation-started', environment: 2, accessKey: hiddenAuthorization });
      const response = await originalPost(url, envelope, config);
      onEvent({ at: new Date().toISOString(), phase: 'recovery-consultation-completed', environment: 2,
        accessKey: hiddenAuthorization, responseHash: createHash('sha256').update(response.data).digest('hex') });
      return response;
    }
    throw new Error('SCOPED_TRANSPORT_OPERATION_REQUIRED');
  };
}

async function main() {
  const root = path.resolve(__dirname, '../..');
  const runtime = require(path.join(root, 'erp/node_modules/dotenv')).parse(fs.readFileSync(path.join(root, 'erp/.env.local')));
  for (const [key, value] of Object.entries(runtime)) if (!process.env[key]) process.env[key] = value;
  if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development' || process.env.VERCEL_ENV !== 'development') throw new Error('DEVELOPMENT_REQUIRED');
  const [documentId, runId, ownerId, mode = 'cancellation'] = process.argv.slice(2);
  if (!['cancellation', 'authorization', 'transport', 'preparation'].includes(mode)) throw new Error('FAULT_MODE_REQUIRED');
  const authorizationMode = mode !== 'cancellation';
  if (![documentId, runId, ownerId].every(value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || ''))) throw new Error('IDENTITY_REQUIRED');
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const ref = fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim();
  if (new URL(url).origin !== `https://${ref}.supabase.co`) throw new Error('LINKED_PROJECT_REQUIRED');
  const { createClient } = require(path.join(root, 'erp/node_modules/@supabase/supabase-js'));
  const db = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  });
  const draft = await db.from('nfe_operation_drafts').select('id,document_id,original_document_id,environment,status,operation_kind,return_order_id,access_key,signed_xml').eq(authorizationMode ? 'id' : 'document_id', documentId).single();
  if (draft.error) throw new Error('TARGET_READ_FAILED');
  const doc = await db.from('nfe_documents').select('id,ambiente,status,document_type,modelo,chave_acesso').eq('id', authorizationMode ? draft.data.original_document_id : documentId).single();
  if (doc.error) throw new Error('TARGET_READ_FAILED');
  const order = await db.from('orders').select('id,status,order_data').eq('id', draft.data.return_order_id).single();
  if (order.error) throw new Error('ORDER_READ_FAILED');
  (authorizationMode ? assertOwnedAuthorizationTarget : assertOwnedTarget)(doc.data, draft.data, order.data, { documentId, runId, ownerId });
  if (mode === 'transport' && doc.data.modelo !== '55') throw new Error('OWNED_MODEL_55_SOURCE_REQUIRED');
  const proof = { startedAt: new Date().toISOString(), projectRef: ref, documentId, runId, ownerId, environment: 2, mode, writes: [], transportEvents: [] };
  const evidence = path.join(root, mode === 'transport' ? 'output/playwright/nfh-transport-fault-server.json' : `output/playwright/nfh-${mode}-persistence-fault-server.json`);
  const saveProof = () => fs.writeFileSync(evidence, JSON.stringify(proof, null, 2));
  const originalFetch = global.fetch;
  if (mode === 'transport') {
    const axios = require('axios');
    axios.post = createTransportFaultPost(axios.post.bind(axios), { sourceAccessKey: doc.data.chave_acesso,
      onEvent: event => { proof.transportEvents.push(event); saveProof(); } });
  } else {
    global.fetch = createPersistenceFaultFetch(originalFetch, { origin: new URL(url).origin, documentId, mode,
      onPrepared: args => fs.writeFileSync(path.join(root, 'scratch/nfh-operation-preparation-args.json'), JSON.stringify(args, null, 2)),
      onWrite: event => { proof.writes.push(event); saveProof(); } });
  }
  const { server: fiscalServer } = require('../local-fiscal-dev-server.cjs');
  const bridge = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    const route = authorizationMode ? '/api/nfe/transmit-operation-draft' : '/api/nfe/cancel';
    if (req.method !== 'POST' || req.url !== route) { res.writeHead(403); res.end(); return; }
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      let body;
      try { body = JSON.parse(raw); } catch { /* Rejected below. */ }
      if (body?.[authorizationMode ? 'draftId' : 'documentId'] !== documentId || body.productionConfirmed !== false) { res.writeHead(403); res.end(); return; }
      const replay = new PassThrough();
      Object.assign(replay, { url: req.url, method: req.method, headers: req.headers, socket: req.socket });
      fiscalServer.emit('request', replay, res);
      replay.end(raw);
    });
  });
  bridge.listen(3002, '127.0.0.1', () => { saveProof(); console.log(JSON.stringify({ ready: true, port: 3002, documentId, environment: 2 })); });
}

if (require.main === module) main().catch(() => { console.error('LOCAL_PERSISTENCE_FAULT_PREFLIGHT_FAILED'); process.exitCode = 1; });
module.exports = { assertOwnedTarget, assertOwnedAuthorizationTarget, createPersistenceFaultFetch, createTransportFaultPost };
