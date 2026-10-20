const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createNormalOutboundFaults } = require('./normal-outbound-fault.cjs');
const key = '41261044512248000107550010000007261251476486';
const key2 = '41261044512248000107550010000007271251476486';
const origin = 'https://test.supabase.co';
const note = k => `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${k}"><ide><tpAmb>2</tpAmb><mod>55</mod><finNFe>1</finNFe><tpNF>1</tpNF></ide></infNFe></NFe>`;
const response = k => `<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe"><cStat>104</cStat><protNFe><infProt><tpAmb>2</tpAmb><chNFe>${k}</chNFe><cStat>100</cStat><nProt>141260000000001</nProt></infProt></protNFe></retEnviNFe>`;
const consult = k => `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${k}</chNFe></consSitNFe>`;
const postUrl = 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4';
async function prepare(faults, orderId = 'order', k = key) {
  return faults.fetch(origin + '/rest/v1/rpc/prepare_nfe_outbound_attempt', { body: JSON.stringify({ p_request_command: { orderId, environment: 2 }, p_snapshot: { order: { id: orderId } }, p_access_key: k, p_signed_xml: note(k) }) });
}
test('transport loss is scoped to a committed owned HML preparation and never repeats SOAP', async () => {
  const events = [], posts = [];
  const faults = createNormalOutboundFaults({ targets: [{ orderId: 'order', model: '55', fault: 'transport' }], origin,
    originalFetch: async () => new Response(JSON.stringify({ documentId: 'doc' })),
    originalPost: async (url, xml) => { posts.push({ url, xml }); return { data: response(key) }; }, onEvent: e => events.push(e) });
  assert.equal(faults.allowsRequest('/api/nfe/emit', { orderId: 'other', environment: 2 }), false);
  assert.equal(faults.allowsRequest('/api/nfe/emit', { orderId: 'order', environment: 1 }), false);
  await assert.rejects(faults.post(postUrl, note(key), {}), /SCOPED_PREPARED/);
  await prepare(faults);
  await assert.rejects(faults.post(postUrl.replace('homologacao.', ''), note(key), {}), /HML_ENDPOINT/);
  await assert.rejects(faults.post(postUrl, note(key).replace('<tpAmb>2', '<tpAmb>1'), {}), /HML_PAYLOAD/);
  assert.equal(posts.length, 0);
  await assert.rejects(faults.post(postUrl, note(key), {}), { code: 'ETIMEDOUT' });
  await prepare(faults);
  await assert.rejects(faults.post(postUrl, note(key), {}), /SINGLE_NORMAL_TRANSMISSION/);
  const queryUrl = postUrl.replace('NFeAutorizacao4', 'NFeConsultaProtocolo4');
  await assert.rejects(faults.post(queryUrl, consult(key), {}), { code: 'ETIMEDOUT' });
  await faults.post(queryUrl, consult(key), {});
  assert.equal(posts.length, 2);
  assert.equal(faults.allowsRequest('/api/nfe/consult', { documentId: 'doc' }), true);
  assert.equal(faults.allowsRequest('/api/nfe/consult', { documentId: 'other' }), false);
  assert.equal(events.filter(e => e.phase === 'real-transmission-started').length, 1);
  assert.equal(JSON.stringify(events).includes(response(key)), false);
});

test('a second prepared key for the same scoped order cannot trigger another SOAP', async () => {
  const posts = [];
  const faults = createNormalOutboundFaults({ targets: [{ orderId: 'order', model: '55', fault: 'transport' }], origin,
    originalFetch: async (_url, init) => new Response(JSON.stringify({ documentId: JSON.parse(init.body).p_access_key })),
    originalPost: async (url, xml) => { posts.push({ url, xml }); return { data: response(xml.includes(key2) ? key2 : key) }; } });
  await prepare(faults);
  await prepare(faults, 'order', key2);
  await assert.rejects(faults.post(postUrl, note(key), {}), { code: 'ETIMEDOUT' });
  await assert.rejects(faults.post(postUrl, note(key2), {}), /SINGLE_NORMAL_TRANSMISSION/);
  assert.equal(posts.length, 1);
});
test('only a matching real authorization is blocked once before persistence; another intent stays independent', async () => {
  const events = [], forwarded = [];
  const faults = createNormalOutboundFaults({ targets: [{ orderId: 'order', model: '55', fault: 'persistence' }, { orderId: 'other', model: '55', fault: 'transport' }], origin,
    originalFetch: async (url, init) => { forwarded.push(url); const body = JSON.parse(init.body); return new Response(JSON.stringify({ documentId: body.p_request_command?.orderId || 'doc' })); },
    originalPost: async () => ({ data: response(key) }), onEvent: e => events.push(e) });
  await prepare(faults);
  await prepare(faults, 'other', key2);
  await faults.post(postUrl, note(key), {});
  const endpoint = origin + '/rest/v1/rpc/persist_nfe_outbound_result';
  const body = { p_document_id: 'order', p_state: 'authorized', p_protocol: '141260000000001', p_response_xml: response(key) };
  await assert.rejects(faults.fetch(endpoint, { body: JSON.stringify({ ...body, p_protocol: '141260000000999' }) }), /MATCHING_REAL_AUTHORIZATION/);
  assert.equal((await faults.fetch(endpoint, { body: JSON.stringify(body) })).status, 503);
  assert.equal((await faults.fetch(endpoint, { body: JSON.stringify(body) })).status, 200);
  assert.equal(faults.attempts.get(key2).sent, false);
  assert.equal(events.filter(e => e.phase === 'authorization-persistence-blocked-before-rpc').length, 1);
  assert.equal(forwarded.length, 3);
});
test('invalid source, XML identity, or failed preparation never registers a transmissible attempt', async () => {
  const faults = createNormalOutboundFaults({ targets: [{ orderId: 'order', model: '55', fault: 'transport' }], origin,
    originalFetch: async () => new Response('{}', { status: 409 }), originalPost: async () => { throw Error('MUST_NOT_CONTACT_SEFAZ'); } });
  await assert.rejects(prepare(faults, 'other'), /SCOPED_ORDER/);
  await prepare(faults);
  assert.equal(faults.attempts.size, 0);
  await assert.rejects(faults.post(postUrl, note(key), {}), /SCOPED_PREPARED/);
});

test('invalid transmission and recovery responses use one real authorization, then recover the same key', async () => {
  const events=[],calls=[];
  const faults=createNormalOutboundFaults({targets:[{orderId:'order',model:'55',fault:'malformed_response'}],origin,
    originalFetch:async()=>new Response(JSON.stringify({documentId:'doc'})),
    originalPost:async(url,xml)=>{calls.push({url,xml});return {data:response(key)};},onEvent:e=>events.push(e)});
  await prepare(faults);
  assert.match((await faults.post(postUrl,note(key),{})).data,/<html>/);
  await assert.rejects(faults.post(postUrl,note(key),{}),/SINGLE_NORMAL_TRANSMISSION/);
  const queryUrl=postUrl.replace('NFeAutorizacao4','NFeConsultaProtocolo4');
  const replies=[];for(let i=0;i<6;i++)replies.push((await faults.post(queryUrl,consult(key),{})).data);
  assert.match(replies[0],/<html>/);assert.equal(replies[1],'');
  assert(!replies[2].includes(key));assert(!replies[3].includes('<tpAmb>2'));
  assert(replies[4].includes('INVALID_CONTROLLED_PROTOCOL'));assert.equal(replies[5],response(key));
  assert.equal(calls.filter(c=>c.url===postUrl).length,1);
  assert.deepEqual(events.filter(e=>e.phase==='controlled-recovery-response-delivered').map(e=>e.mode),['html','empty','wrong_key','wrong_environment','wrong_protocol','valid']);
});

test('malformed recovery cannot replace a mismatched real protocol with a fake success',async()=>{
  let call=0;
  const faults=createNormalOutboundFaults({targets:[{orderId:'order',model:'55',fault:'malformed_response'}],origin,
    originalFetch:async()=>new Response(JSON.stringify({documentId:'doc'})),
    originalPost:async()=>({data:++call===1?response(key):response(key).replace('141260000000001','141260000000002')})});
  await prepare(faults);await faults.post(postUrl,note(key),{});
  await assert.rejects(faults.post(postUrl.replace('NFeAutorizacao4','NFeConsultaProtocolo4'),consult(key),{}),/MATCHING_REAL_RECOVERY_REQUIRED/);
});
