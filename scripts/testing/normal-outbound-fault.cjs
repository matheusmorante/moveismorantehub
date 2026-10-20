// Local UI audit only. No CLI transmission and no production imports.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const { PassThrough } = require('node:stream');
const { createHash } = require('node:crypto');
const { DOMParser } = require('../../erp/node_modules/@xmldom/xmldom');
const ns = 'http://www.portalfiscal.inf.br/nfe';
const hash = value => createHash('sha256').update(value).digest('hex');
function parse(xml) {
  if (typeof xml !== 'string' || /<!DOCTYPE/i.test(xml)) throw Error('INVALID_AUDIT_XML');
  return new DOMParser({ onError() { throw Error('INVALID_AUDIT_XML'); } }).parseFromString(xml, 'text/xml');
}
const nodes = (doc, tag) => Array.from(doc.getElementsByTagNameNS(ns, tag));
const value = (doc, tag) => nodes(doc, tag).map(n => n.textContent).join();
function authorization(xml, key) {
  const doc = parse(xml), protocols = nodes(doc, 'infProt');
  if (protocols.length !== 1) return null;
  const p = protocols[0];
  return value(p, 'tpAmb') === '2' && value(p, 'chNFe') === key && value(p, 'cStat') === '100' && /^\d{15}$/.test(value(p, 'nProt'))
    ? { protocol: value(p, 'nProt'), responseHash: hash(xml) } : null;
}
function createNormalOutboundFaults({ targets, origin, originalFetch, originalPost, onEvent = () => {} }) {
  const byOrder = new Map(targets.map(t => [t.orderId, t])), attempts = new Map(), sentOrders = new Set();
  const event = (phase, a, extra = {}) => onEvent({ at: new Date().toISOString(), phase, orderId: a.orderId, documentId: a.documentId, accessKey: a.accessKey, model: a.model, environment: 2, ...extra });
  const timeout = () => Object.assign(Error('Controlled local HML audit interruption.'), { code: 'ETIMEDOUT' });
  function prepared(body) {
    const command = body?.p_request_command, target = byOrder.get(command?.orderId);
    if (!target) throw Error('SCOPED_ORDER_REQUIRED');
    const xml = parse(body.p_signed_xml), notes = nodes(xml, 'infNFe'), key = body.p_access_key;
    if (command.environment !== 2 || body.p_snapshot?.order?.id !== target.orderId || notes.length !== 1 ||
        !/^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/.test(key || '') || notes[0].getAttribute('Id') !== 'NFe' + key ||
        value(xml, 'tpAmb') !== '2' || value(xml, 'mod') !== target.model || value(xml, 'finNFe') !== '1' || value(xml, 'tpNF') !== '1') throw Error('OWNED_NORMAL_HML_XML_REQUIRED');
    return { ...target, accessKey: key, signedXmlHash: hash(body.p_signed_xml), sent: false, persistenceFailed: false, consultationBlocked: false };
  }
  return {
    attempts,
    allowsRequest(route, body) {
      if (body?.productionConfirmed === true) return false;
      if (route === '/api/nfe/consult') return [...attempts.values()].some(a => a.documentId === body?.documentId);
      if (route !== '/api/nfe/emit') return false;
      if (body?.retryDocumentId) return [...attempts.values()].some(a => a.documentId === body.retryDocumentId);
      return body?.environment === 2 && byOrder.has(body?.orderId);
    },
    async fetch(input, init) {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      let body;
      if (url.origin === origin && typeof init?.body === 'string') {
        try { body = JSON.parse(init.body); } catch { /* Forward unchanged. */ }
      }
      if (url.origin === origin && url.pathname === '/rest/v1/rpc/prepare_nfe_outbound_attempt') {
        const a = prepared(body);
        const response = await originalFetch(input, init);
        if (response.ok) {
          const result = await response.clone().json();
          if (!result?.documentId) throw Error('PREPARATION_ID_NOT_CONFIRMED');
          a.documentId = result.documentId;
          if (!attempts.has(a.accessKey)) attempts.set(a.accessKey, a);
          event('preparation-confirmed', a, { signedXmlHash: a.signedXmlHash });
        }
        return response;
      }
      if (url.origin === origin && url.pathname === '/rest/v1/rpc/persist_nfe_outbound_result') {
        const a = [...attempts.values()].find(a => a.documentId === body?.p_document_id);
        if (a?.fault === 'persistence' && body.p_state === 'authorized' && !a.persistenceFailed) {
          const confirmed = authorization(body.p_response_xml, a.accessKey);
          if (!a.authorization || !confirmed || confirmed.protocol !== body.p_protocol || confirmed.responseHash !== a.authorization.responseHash) throw Error('MATCHING_REAL_AUTHORIZATION_REQUIRED');
          a.persistenceFailed = true;
          event('authorization-persistence-blocked-before-rpc', a, confirmed);
          return new Response(JSON.stringify({ code: 'NFH_CONTROLLED_PERSISTENCE_FAILURE', message: 'Local audit: confirmed result was not sent to PostgreSQL.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
      }
      return originalFetch(input, init);
    },
    async post(url, envelope, config) {
      const endpoint = new URL(url), xml = parse(envelope);
      if (value(xml, 'tpAmb') !== '2') throw Error('HML_PAYLOAD_REQUIRED');
      const note = nodes(xml, 'infNFe');
      const key = note.length === 1 ? note[0].getAttribute('Id')?.replace(/^NFe/, '') : value(xml, 'chNFe');
      const a = attempts.get(key);
      if (!a) throw Error('SCOPED_PREPARED_ATTEMPT_REQUIRED');
      const prefix = a.model === '65' ? 'nfce' : 'nfe';
      if (endpoint.origin !== `https://homologacao.${prefix}.sefa.pr.gov.br`) throw Error('HML_ENDPOINT_REQUIRED');
      if (note.length === 1) {
        if (endpoint.pathname !== `/${prefix}/NFeAutorizacao4` || a.sent || sentOrders.has(a.orderId) || value(xml, 'mod') !== a.model || value(xml, 'finNFe') !== '1' || value(xml, 'tpNF') !== '1') throw Error('SINGLE_NORMAL_TRANSMISSION_REQUIRED');
        sentOrders.add(a.orderId);
        a.sent = true;
        event('real-transmission-started', a, { signedXmlHash: a.signedXmlHash });
        const response = await originalPost(url, envelope, config);
        a.authorization = authorization(response.data, key);
        if (a.authorization) event('real-authorization-received', a, a.authorization);
        if (a.fault === 'transport' && a.authorization) {
          event('real-authorization-response-hidden', a, a.authorization);
          throw timeout();
        }
        if (a.fault === 'malformed_response' && a.authorization) {
          const data = '<html><body>Controlled local HML audit outage</body></html>';
          event('real-authorization-response-replaced', a, { mode: 'html', originalHash: hash(response.data), deliveredHash: hash(data) });
          return { ...response, data };
        }
        return response;
      }
      if (endpoint.pathname !== `/${prefix}/NFeConsultaProtocolo4` || value(xml, 'xServ') !== 'CONSULTAR' || !a.sent) throw Error('SAME_KEY_CONSULTATION_REQUIRED');
      if (a.fault === 'transport' && a.authorization && !a.consultationBlocked) {
        a.consultationBlocked = true;
        event('first-consultation-outage', a);
        throw timeout();
      }
      event('recovery-consultation-started', a);
      const response = await originalPost(url, envelope, config);
      const confirmed = authorization(response.data, key);
      event('recovery-consultation-completed', a, confirmed || { responseHash: hash(response.data) });
      if (a.fault === 'malformed_response') {
        if (!confirmed || confirmed.protocol !== a.authorization?.protocol) throw Error('MATCHING_REAL_RECOVERY_REQUIRED');
        const modes = ['html', 'empty', 'wrong_key', 'wrong_environment', 'wrong_protocol', 'valid'];
        const mode = modes[a.invalidConsultationIndex || 0];
        if (!mode) throw Error('CONTROLLED_RECOVERY_LIMIT');
        let data = response.data;
        if (mode === 'html') data = '<html><body>Controlled local HML audit outage</body></html>';
        else if (mode === 'empty') data = '';
        else if (mode !== 'valid') {
          const doc = parse(data);
          const [tag, replacement] = mode === 'wrong_key'
            ? ['chNFe', key.slice(0, -1) + (key.endsWith('0') ? '1' : '0')]
            : mode === 'wrong_environment' ? ['tpAmb', '1']
              : ['nProt', 'INVALID_CONTROLLED_PROTOCOL'];
          nodes(doc, tag).forEach(n => { n.textContent = replacement; });
          data = doc.toString();
        }
        a.invalidConsultationIndex = (a.invalidConsultationIndex || 0) + 1;
        event('controlled-recovery-response-delivered', a, { mode, originalHash: hash(response.data), deliveredHash: hash(data) });
        return { ...response, data };
      }
      return response;
    },
  };
}
async function main() {
  const root = path.resolve(__dirname, '../..');
  if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development' || process.env.VERCEL_ENV !== 'development') throw Error('DEVELOPMENT_REQUIRED');
  const local = require('../../erp/node_modules/dotenv').parse(fs.readFileSync(path.join(root, 'erp/.env.local')));
  process.env.NFE_HML_TEST_OPERATOR_EMAIL = local.NFE_HML_TEST_OPERATOR_EMAIL;
  const ref = fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim();
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (ref !== 'hkoxhourxwlddgsfdgws' || new URL(url).origin !== `https://${ref}.supabase.co`) throw Error('LINKED_PROJECT_REQUIRED');
  const targets = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  if (!Array.isArray(targets) || !targets.length || targets.length > 2 || new Set(targets.map(t => t.orderId)).size !== targets.length || targets.some(t => !['55', '65'].includes(t.model) || !['transport', 'persistence', 'malformed_response'].includes(t.fault))) throw Error('SCOPED_TARGETS_REQUIRED');
  const { createClient } = require('../../erp/node_modules/@supabase/supabase-js');
  const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } };
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, options);
  const status = await admin.rpc('test_artifact_policy_status');
  if (status.error || status.data?.ready !== true || status.data.behavioralProofRequired !== false) throw Error('READINESS_REQUIRED');
  const client = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, options);
  const signIn = await client.auth.signInWithPassword({ email: local.NFE_HML_TEST_OPERATOR_EMAIL, password: local.NFE_HML_TEST_OPERATOR_PASSWORD });
  if (signIn.error) throw Error('OPERATOR_AUTHENTICATION_REQUIRED');
  const { loadPersistedFiscalOrder } = require('./fiscal-persisted-artifact.cjs');
  for (const target of targets) {
    const artifact = await loadPersistedFiscalOrder(client, { ...target, expectedEmail: local.NFE_HML_TEST_OPERATOR_EMAIL });
    // Scenario metadata can outlive a corrected fiscal context. The explicitly
    // scoped model is checked against the actual signed XML before any SOAP.
    if (artifact.ownerId !== target.ownerId) throw Error('OWNED_MODEL_REQUIRED');
  }
  const proof = { startedAt: new Date().toISOString(), projectRef: ref, environment: 2, targets, events: [] };
  const evidenceName = process.argv[3] || 'nfh-normal-55-two-intents-fault-server.json';
  if (!/^nfh-[a-z0-9-]+\.json$/.test(evidenceName)) throw Error('AUDIT_EVIDENCE_BASENAME_REQUIRED');
  const evidence = path.join(root, 'output/playwright', evidenceName);
  if (fs.existsSync(evidence)) throw Error('EXISTING_AUDIT_EVIDENCE_REQUIRES_REVIEW');
  const save = () => fs.writeFileSync(evidence, JSON.stringify(proof, null, 2) + '\n');
  const backendRequire = createRequire(path.join(root, 'erp/server/nfe/emit.cjs'));
  const axios = backendRequire('axios');
  const faults = createNormalOutboundFaults({ targets, origin: new URL(url).origin, originalFetch: global.fetch.bind(global), originalPost: axios.post.bind(axios), onEvent: e => { proof.events.push(e); save(); } });
  global.fetch = faults.fetch;
  axios.post = faults.post;
  const { server: fiscalServer } = require('../local-fiscal-dev-server.cjs');
  const bridge = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'POST') { res.writeHead(403); res.end(); return; }
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1048576) req.destroy(); });
    req.on('end', () => {
      let body;
      try { body = JSON.parse(raw); } catch { /* Rejected below. */ }
      if (!faults.allowsRequest(req.url, body)) { res.writeHead(403); res.end(); return; }
      const replay = new PassThrough();
      Object.assign(replay, { url: req.url, method: req.method, headers: req.headers, socket: req.socket });
      fiscalServer.emit('request', replay, res);
      replay.end(raw);
    });
  });
  bridge.listen(3002, '127.0.0.1', () => { save(); console.log(JSON.stringify({ ready: true, port: 3002, environment: 2, targets: targets.map(t => ({ orderId: t.orderId, fault: t.fault })) })); });
}
if (require.main === module) main().catch(error => { console.error(/^[A-Z_]+$/.test(error.message) ? error.message : 'NORMAL_OUTBOUND_FAULT_PREFLIGHT_FAILED'); process.exitCode = 1; });
module.exports = { createNormalOutboundFaults };
