const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertOwnedTarget, assertOwnedAuthorizationTarget, createPersistenceFaultFetch } = require('./cancellation-persistence-fault.cjs');

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
