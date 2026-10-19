const test = require('node:test');
const assert = require('node:assert/strict');
const {createAuthorizedConsultationFaults,readOnlyFetch} = require('./authorized-consult-fault.cjs');
const target = {documentId:'owned-doc',orderId:'owned-order',environment:2,model:'55',accessKey:'41261044512248000107550010000007311425778838',protocol:'141260000638279'};
const url = 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4';
const request = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${target.accessKey}</chNFe></consSitNFe>`;
const real = `<n:retConsSitNFe xmlns:n="http://www.portalfiscal.inf.br/nfe"><n:tpAmb>2</n:tpAmb><n:cStat>100</n:cStat><n:chNFe>${target.accessKey}</n:chNFe><n:protNFe><n:infProt><n:tpAmb>2</n:tpAmb><n:cStat>100</n:cStat><n:chNFe>${target.accessKey}</n:chNFe><n:nProt>${target.protocol}</n:nProt></n:infProt></n:protNFe></n:retConsSitNFe>`;
test('six controlled responses require a matching real consultation; no XML or credentials are logged',async()=>{
  const events=[],calls=[];
  const faults=createAuthorizedConsultationFaults({target,onEvent:e=>events.push(e),originalPost:async(...args)=>{calls.push(args);return {data:real,status:200};}});
  const results=[];for(let i=0;i<6;i++)results.push((await faults.post(url,request,{secret:'never-log'})).data);
  assert.match(results[0],/<html>/);assert.equal(results[1],'');
  assert(!results[2].includes(target.accessKey));assert(!results[3].includes('>2<'));
  assert(!results[4].includes(target.protocol));assert.equal(results[5],real);
  assert.equal(calls.length,6);assert.equal(events.filter(e=>e.phase==='response-delivered').length,6);
  assert(!JSON.stringify(events).includes(real));assert(!JSON.stringify(events).includes('never-log'));
  await assert.rejects(faults.post(url,request,{}),/SCOPED_CONSULTATION_REQUIRED/);
  assert.equal(calls.length,6);
});
test('production, authorization, event, wrong key and wrong environment never contact SOAP',async()=>{
  let calls=0;const faults=createAuthorizedConsultationFaults({target,originalPost:async()=>{calls++;return{data:real};}});
  for(const endpoint of [url.replace('homologacao.',''),url.replace('NFeConsultaProtocolo4','NFeAutorizacao4'),url.replace('NFeConsultaProtocolo4','NFeRecepcaoEvento4')])
    await assert.rejects(faults.post(endpoint,request,{}),/ONLY_HML_CONSULTATION_ALLOWED/);
  for(const xml of [request.replace('<tpAmb>2','<tpAmb>1'),request.replace(target.accessKey,target.accessKey.slice(0,-1)+'0'),request.replace('CONSULTAR','ENVIAR')])
    await assert.rejects(faults.post(url,xml,{}),/SCOPED_CONSULTATION_REQUIRED/);
  assert.equal(calls,0);
});
test('a mismatched real response is never transformed into a simulated proof',async()=>{
  const events=[];const faults=createAuthorizedConsultationFaults({target,onEvent:e=>events.push(e),originalPost:async()=>({data:real.replaceAll(target.protocol,'141260000000000')})});
  await assert.rejects(faults.post(url,request,{}),/MATCHING_REAL_CONSULTATION_REQUIRED/);
  assert.equal(events.filter(e=>e.phase==='response-delivered').length,0);
});
test('bridge only allows the owned document consultation',()=>{
  const faults=createAuthorizedConsultationFaults({target,originalPost:async()=>({data:real})});
  assert.equal(faults.allowsRequest('/api/nfe/consult',{documentId:target.documentId}),true);
  for(const [route,body] of [['/api/nfe/emit',{documentId:target.documentId}],['/api/nfe/consult',{documentId:'other'}],['/api/nfe/consult',{documentId:target.documentId,productionConfirmed:true}]])
    assert.equal(faults.allowsRequest(route,body),false);
});
test('all database writes and external fetch origins are blocked',async()=>{
  let calls=0;const fetch=readOnlyFetch('https://test.supabase.co',async()=>{calls++;return 'read';});
  for(const method of ['POST','PUT','PATCH','DELETE'])assert.throws(()=>fetch('https://test.supabase.co/rest/v1/orders',{method}),/DATABASE_READ_ONLY/);
  assert.throws(()=>fetch('https://other.example/read',{}),/DATABASE_READ_ONLY/);
  assert.equal(await fetch('https://test.supabase.co/rest/v1/orders',{}),'read');assert.equal(calls,1);
});
test('overlapping UI calls cannot consume another scenario or SOAP',async()=>{
  let release,calls=0;const barrier=new Promise(resolve=>{release=resolve;});
  const faults=createAuthorizedConsultationFaults({target,originalPost:async()=>{calls++;await barrier;return {data:real};}});
  const first=faults.post(url,request,{});
  await assert.rejects(faults.post(url,request,{}),/SCOPED_CONSULTATION_REQUIRED/);
  release();await first;assert.equal(calls,1);
});
