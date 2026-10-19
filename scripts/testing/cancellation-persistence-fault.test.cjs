const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertOwnedTarget, assertOwnedAuthorizationTarget, createPersistenceFaultFetch, createTransportFaultPost } = require('./cancellation-persistence-fault.cjs');

test('only an owned authorized HML return can start the local fault harness', () => {
  const expected = { documentId: 'doc', runId: 'run', ownerId: 'owner' };
  const doc = { id: 'doc', ambiente: 2, status: 'homologada', document_type: 'return' };
  const draft = { document_id: 'doc', environment: 2, status: 'authorized', operation_kind: 'return', return_order_id: 'return' };
  const order = { id: 'return', order_data: { is_test: true, testArtifact: { is_test: true, runId: 'run', ownerId: 'owner' } } };
  assert.doesNotThrow(() => assertOwnedTarget(doc, draft, order, expected));
  assert.throws(() => assertOwnedTarget({ ...doc, ambiente: 1 }, draft, order, expected));
  assert.throws(() => assertOwnedTarget(doc, { ...draft, environment: 1 }, order, expected));
  assert.throws(() => assertOwnedTarget(doc, draft, order, { ...expected, ownerId: 'another-owner' }));
  assert.throws(() => assertOwnedTarget(doc, draft, order, { ...expected, runId: 'another-run' }));
  assert.throws(() => assertOwnedTarget(doc, draft, { ...order, order_data: { is_test: false } }, expected));
});

test('fails exactly one confirmed cancellation persistence and never changes another target or environment', async () => {
  const forwarded = [];
  const writes = [];
  const origin = 'https://test.supabase.co';
  const originalFetch = async (...args) => { forwarded.push(args); return new Response('{}', { status: 200 }); };
  const wrapped = createPersistenceFaultFetch(originalFetch, { origin, documentId: 'doc', onWrite: event => writes.push(event) });
  const body = { p_document_id: 'doc', p_environment: 2, p_status: 'registered', p_cstat: '135', p_event_id: 'event', p_protocol: '141260000000001', p_response_xml: '<valid-response />' };
  const endpoint = origin + '/rest/v1/rpc/persist_nfe_cancellation_result';
  for (const other of [{ ...body, p_document_id: 'other' }, { ...body, p_environment: 1 }, { ...body, p_status: 'unknown' }, { ...body, p_cstat: '573' }]) {
    assert.equal((await wrapped(endpoint, { method: 'POST', body: JSON.stringify(other) })).status, 200);
  }
  assert.equal((await wrapped(endpoint, { method: 'POST', body: JSON.stringify(body) })).status, 503);
  assert.equal((await wrapped(endpoint, { method: 'POST', body: JSON.stringify(body) })).status, 200);
  assert.equal(forwarded.length, 5);
  assert.deepEqual(writes.map(event => event.injected), [true, false]);
  assert.equal(JSON.stringify(writes).includes(body.p_response_xml), false);
});

test('authorization fault requires an owned ready HML return without a previous attempt', () => {
  const expected = { documentId: 'draft', runId: 'run', ownerId: 'owner' };
  const source = { id: 'source', ambiente: 2, status: 'homologada' };
  const draft = { id: 'draft', original_document_id: 'source', environment: 2, status: 'ready', operation_kind: 'return', return_order_id: 'return' };
  const order = { id: 'return', status: 'fulfilled', order_data: { returnStockProcessed: true, is_test: true, testArtifact: { is_test: true, runId: 'run', ownerId: 'owner' } } };
  assert.doesNotThrow(() => assertOwnedAuthorizationTarget(source, draft, order, expected));
  for (const invalid of [{ ...draft, environment: 1 }, { ...draft, status: 'transmitting' }, { ...draft, access_key: 'existing' }, { ...draft, document_id: 'existing' }]) {
    assert.throws(() => assertOwnedAuthorizationTarget(source, invalid, order, expected));
  }
  assert.throws(() => assertOwnedAuthorizationTarget({ ...source, ambiente: 1 }, draft, order, expected));
  assert.throws(() => assertOwnedAuthorizationTarget(source, draft, order, { ...expected, ownerId: 'other' }));
  assert.throws(() => assertOwnedAuthorizationTarget(source, draft, { ...order, status: 'scheduled' }, expected));
});

test('authorization fault accepts inner 100 only with matching HML key/protocol and fails once', async () => {
  let forwarded = 0;
  const writes = [];
  const origin = 'https://test.supabase.co';
  const key = '41261044512248000107550010000007201681712596';
  const protocol = '141260000637007';
  const response = `<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe"><cStat>104</cStat><protNFe><infProt><tpAmb>2</tpAmb><chNFe>${key}</chNFe><cStat>100</cStat><nProt>${protocol}</nProt></infProt></protNFe></retEnviNFe>`;
  const signed = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${key}"><ide><tpAmb>2</tpAmb></ide></infNFe></NFe>`;
  const body = { p_draft_id: 'draft', p_document_id: 'draft', p_status: 'homologada', p_access_key: key, p_protocol_number: protocol, p_signed_xml: signed, p_sefaz_response_xml: response };
  const wrapped = createPersistenceFaultFetch(async () => { forwarded++; return new Response('{}', { status: 200 }); }, { origin, documentId: 'draft', mode: 'authorization', onWrite: event => writes.push(event) });
  const endpoint = origin + '/rest/v1/rpc/persist_authorized_nfe_operation_draft';
  for (const invalid of [{ ...body, p_draft_id: 'other' }, { ...body, p_status: 'autorizada' }, { ...body, p_sefaz_response_xml: response.replace('<tpAmb>2', '<tpAmb>1') }, { ...body, p_signed_xml: signed.replace('<tpAmb>2', '<tpAmb>1') }, { ...body, p_sefaz_response_xml: response.replace('<cStat>100', '<cStat>434') }, { ...body, p_protocol_number: '141260000000000' }, { ...body, p_sefaz_response_xml: '<broken>' }]) {
    assert.equal((await wrapped(endpoint, { method: 'POST', body: JSON.stringify(invalid) })).status, 200);
  }
  assert.equal((await wrapped(endpoint, { method: 'POST', body: JSON.stringify(body) })).status, 503);
  assert.equal((await wrapped(endpoint, { method: 'POST', body: JSON.stringify(body) })).status, 200);
  assert.equal(forwarded, 8);
  assert.deepEqual(writes.map(event => event.injected), [true, false]);
  assert.equal(writes[0].cStat, '100');
  assert.equal(writes[0].protocol, protocol);
  assert.equal(JSON.stringify(writes).includes(response), false);
  assert.equal(JSON.stringify(writes).includes(signed), false);
});

test('transport audit hides only a matching real HML 100 then interrupts its immediate consultation', async () => {
  const sourceAccessKey = '41261044512248000107550010000007231353083330';
  const accessKey = '41261044512248000107550010000007261251476486';
  const endpoint = 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4';
  const note = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${accessKey}"><ide><tpAmb>2</tpAmb><mod>55</mod><finNFe>4</finNFe><tpNF>0</tpNF></ide><det><DFeReferenciado><chaveAcesso>${sourceAccessKey}</chaveAcesso></DFeReferenciado></det></infNFe></NFe></soap:Body></soap:Envelope>`;
  const reply = `<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe"><protNFe><infProt><tpAmb>2</tpAmb><chNFe>${accessKey}</chNFe><cStat>100</cStat><nProt>141260000000001</nProt></infProt></protNFe></retEnviNFe>`;
  const consultation = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
  let sent = 0;
  const events = [];
  const post = createTransportFaultPost(async () => { sent++; return { data: reply }; }, { sourceAccessKey, onEvent: event => events.push(event) });
  await assert.rejects(post(endpoint.replace('homologacao.', ''), note, {}), /HML_55_ENDPOINT_REQUIRED/);
  await assert.rejects(post(endpoint, note.replace('<tpAmb>2', '<tpAmb>1'), {}), /HML_PAYLOAD_REQUIRED/);
  await assert.rejects(post(endpoint, note.replace(sourceAccessKey, '4'.repeat(44)), {}), /OWNED_SINGLE_RETURN_TRANSMISSION_REQUIRED/);
  assert.equal(sent, 0);
  await assert.rejects(post(endpoint, note, {}), { code: 'ETIMEDOUT' });
  await assert.rejects(post(endpoint.replace('NFeAutorizacao4', 'NFeConsultaProtocolo4'), consultation, {}), { code: 'ETIMEDOUT' });
  await assert.rejects(post(endpoint, note, {}), /OWNED_SINGLE_RETURN_TRANSMISSION_REQUIRED/);
  assert.equal(sent, 1);
  assert.deepEqual(events.map(event => event.phase), ['real-transmission-started', 'real-authorization-response-hidden', 'immediate-consultation-outage']);
  assert.equal(events[1].accessKey, accessKey);
  assert.equal(events[1].protocol, '141260000000001');
  await assert.rejects(post(endpoint, consultation.replace(accessKey, '4'.repeat(44)), {}), /SCOPED_TRANSPORT_OPERATION_REQUIRED/);
  assert.deepEqual(await post(endpoint.replace('NFeAutorizacao4', 'NFeConsultaProtocolo4'), consultation, {}), { data: reply });
  assert.equal(sent, 2);
  assert.deepEqual(events.slice(-2).map(event => event.phase), ['recovery-consultation-started', 'recovery-consultation-completed']);
  assert.equal(JSON.stringify(events).includes(reply), false);
});

test('transport audit never changes an unrelated authorization reply into a matching result', async () => {
  const sourceAccessKey = '41261044512248000107550010000007231353083330';
  const accessKey = '41261044512248000107550010000007261251476486';
  const note = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${accessKey}"><tpAmb>2</tpAmb><mod>55</mod><finNFe>4</finNFe><tpNF>0</tpNF><chaveAcesso>${sourceAccessKey}</chaveAcesso></infNFe></NFe>`;
  const reply = { data: '<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe"><cStat>105</cStat></retEnviNFe>' };
  const events = [];
  const post = createTransportFaultPost(async () => reply, { sourceAccessKey, onEvent: event => events.push(event) });
  assert.equal(await post('https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4', note, {}), reply);
  assert.deepEqual(events.map(event => event.phase), ['real-transmission-started']);
});

test('transport audit blocks a second transmission while the first network response is still pending', async () => {
  const sourceAccessKey = '41261044512248000107550010000007231353083330';
  const accessKey = '41261044512248000107550010000007261251476486';
  const note = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${accessKey}"><tpAmb>2</tpAmb><mod>55</mod><finNFe>4</finNFe><tpNF>0</tpNF><chaveAcesso>${sourceAccessKey}</chaveAcesso></infNFe></NFe>`;
  let release;
  let sent = 0;
  const post = createTransportFaultPost(() => { sent++; return new Promise(resolve => { release = resolve; }); }, { sourceAccessKey });
  const endpoint = 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4';
  const first = post(endpoint, note, {});
  await assert.rejects(post(endpoint, note, {}), /OWNED_SINGLE_RETURN_TRANSMISSION_REQUIRED/);
  release({ data: '<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe"><cStat>105</cStat></retEnviNFe>' });
  await first;
  assert.equal(sent, 1);
});

test('preparation capture stops the owned HML RPC without forwarding it to PostgreSQL', async () => {
  const key = '41261044512248000107550010000007261251476486';
  const body = { p_draft_id: 'draft', p_access_key: key,
    p_signed_xml: `<NFe><infNFe Id="NFe${key}"><tpAmb>2</tpAmb></infNFe></NFe>` };
  let forwarded = 0;
  let captured;
  const wrapped = createPersistenceFaultFetch(async () => { forwarded++; return new Response('{}'); }, {
    origin: 'https://test.supabase.co', documentId: 'draft', mode: 'preparation', onPrepared: args => { captured = args; },
  });
  const endpoint = 'https://test.supabase.co/rest/v1/rpc/prepare_nfe_operation_attempt';
  assert.equal((await wrapped(endpoint, { body: JSON.stringify(body) })).status, 503);
  assert.deepEqual(captured, body);
  assert.equal(forwarded, 0);
  await assert.rejects(wrapped(endpoint, { body: JSON.stringify({ ...body, p_signed_xml: body.p_signed_xml.replace('<tpAmb>2', '<tpAmb>1') }) }), /OWNED_HML_PREPARATION_REQUIRED/);
  assert.equal(forwarded, 0);
});
