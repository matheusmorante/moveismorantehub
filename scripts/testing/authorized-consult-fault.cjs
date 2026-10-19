// Local UI-only consultation audit. Cannot authorize, cancel, reserve or persist.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { PassThrough } = require('node:stream');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const { DOMParser } = require('../../erp/node_modules/@xmldom/xmldom');
const ns = 'http://www.portalfiscal.inf.br/nfe';
const hash = x => createHash('sha256').update(x).digest('hex');
const modes = ['html', 'empty', 'wrong_key', 'wrong_environment', 'wrong_protocol', 'valid'];
const nodes = (d, tag) => Array.from(d.getElementsByTagNameNS(ns, tag));
function parse(xml) {
  if (typeof xml !== 'string' || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('SAFE_XML_REQUIRED');
  return new DOMParser({onError() { throw Error('SAFE_XML_REQUIRED'); }}).parseFromString(xml,'text/xml');
}
function createAuthorizedConsultationFaults({target, originalPost, onEvent = () => {}}) {
  let index = 0, busy = false;
  if (!['55','65'].includes(target.model) || target.environment !== 2 ||
      !/^\d{44}$/.test(target.accessKey) || target.accessKey.slice(20,22) !== target.model ||
      !/^\d{15}$/.test(target.protocol)) throw Error('HML_TARGET_REQUIRED');
  return {
    allowsRequest(route, body) {
      return route === '/api/nfe/consult' && body?.documentId === target.documentId && body.productionConfirmed !== true;
    },
    async post(url, envelope, config) {
      const prefix = target.model === '65' ? 'nfce' : 'nfe';
      if (url !== `https://homologacao.${prefix}.sefa.pr.gov.br/${prefix}/NFeConsultaProtocolo4`) throw Error('ONLY_HML_CONSULTATION_ALLOWED');
      const request = parse(envelope);
      if (nodes(request,'consSitNFe').length !== 1 || nodes(request,'chNFe').length !== 1 ||
          nodes(request,'chNFe')[0].textContent !== target.accessKey ||
          nodes(request,'tpAmb').length !== 1 || nodes(request,'tpAmb')[0].textContent !== '2' ||
          nodes(request,'xServ').length !== 1 || nodes(request,'xServ')[0].textContent !== 'CONSULTAR' ||
          nodes(request,'infNFe').length || busy || index >= modes.length) throw Error('SCOPED_CONSULTATION_REQUIRED');
      busy = true;
      try {
        const mode = modes[index];
        onEvent({phase:'real-consultation-started',mode,documentId:target.documentId});
        const response = await originalPost(url, envelope, config);
        const doc = parse(response.data);
        if (nodes(doc,'retConsSitNFe').length !== 1 || nodes(doc,'infProt').length !== 1 ||
            nodes(doc,'chNFe').length !== 2 || nodes(doc,'chNFe').some(n=>n.textContent !== target.accessKey) ||
            nodes(doc,'tpAmb').length !== 2 || nodes(doc,'tpAmb').some(n=>n.textContent !== '2') ||
            nodes(doc,'cStat').length !== 2 || nodes(doc,'cStat').some(n=>n.textContent !== '100') ||
            nodes(doc,'nProt').length !== 1 || nodes(doc,'nProt')[0].textContent !== target.protocol) throw Error('MATCHING_REAL_CONSULTATION_REQUIRED');
        const replacements = {
          wrong_key: ['chNFe', target.accessKey.slice(0,-1)+(target.accessKey.endsWith('0')?'1':'0')],
          wrong_environment: ['tpAmb','1'],
          wrong_protocol: ['nProt',target.protocol.slice(0,-1)+(target.protocol.endsWith('0')?'1':'0')],
        };
        if (replacements[mode]) {
          const [tag,value] = replacements[mode];
          nodes(doc,tag).forEach(n=>{n.textContent=value;});
        }
        const data = mode === 'html' ? '<html><body>Controlled local audit outage</body></html>' :
          mode === 'empty' ? '' : mode === 'valid' ? response.data : doc.toString();
        index++;
        onEvent({phase:'response-delivered',mode,documentId:target.documentId,
          originalHash:hash(response.data),deliveredHash:hash(data),realAuthorizationMatched:true});
        return {...response,data};
      } finally { busy = false; }
    },
  };
}
function readOnlyFetch(origin, originalFetch) {
  return (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    if (url.origin !== origin || !['GET','HEAD'].includes(method)) throw Error('CONSULTATION_DATABASE_READ_ONLY');
    return originalFetch(input, init);
  };
}
async function main() {
  const root = path.resolve(__dirname,'../..');
  if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development' || process.env.VERCEL_ENV !== 'development') throw Error('DEVELOPMENT_REQUIRED');
  const local = require('../../erp/node_modules/dotenv').parse(fs.readFileSync(path.join(root,'erp/.env.local')));
  process.env.NFE_HML_TEST_OPERATOR_EMAIL = local.NFE_HML_TEST_OPERATOR_EMAIL;
  const ref = fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim();
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (ref !== 'hkoxhourxwlddgsfdgws' || new URL(url).origin !== `https://${ref}.supabase.co`) throw Error('LINKED_PROJECT_REQUIRED');
  const target = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const name = process.argv[3];
  if (!/^nfh-[a-z0-9-]+\.json$/.test(name||'')) throw Error('EVIDENCE_NAME_REQUIRED');
  const evidence = path.join(root,'output/playwright',name);
  if (fs.existsSync(evidence)) throw Error('EXISTING_EVIDENCE_REQUIRES_REVIEW');
  const { createClient } = require('../../erp/node_modules/@supabase/supabase-js');
  const client = createClient(url,process.env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth = await client.auth.signInWithPassword({email:local.NFE_HML_TEST_OPERATOR_EMAIL,password:local.NFE_HML_TEST_OPERATOR_PASSWORD});
  if (auth.error) throw Error('OPERATOR_AUTHENTICATION_REQUIRED');
  const artifact = await require('./fiscal-persisted-artifact.cjs').loadPersistedFiscalOrder(client,{...target,expectedEmail:local.NFE_HML_TEST_OPERATOR_EMAIL});
  if (artifact.ownerId !== target.ownerId) throw Error('OWNED_TARGET_REQUIRED');
  const {data:doc,error} = await client.from('nfe_documents').select('id,order_id,modelo,ambiente,status,chave_acesso,numero_protocolo,fiscal_ruleset_version').eq('id',target.documentId).single();
  if (error || doc.order_id !== target.orderId || doc.modelo !== target.model || doc.ambiente !== 2 ||
      doc.status !== 'homologada' || doc.fiscal_ruleset_version !== 'NORMAL_SALE_V1' ||
      doc.chave_acesso !== target.accessKey || doc.numero_protocolo !== target.protocol) throw Error('PERSISTED_AUTHORIZED_TARGET_REQUIRED');
  const proof = {startedAt:new Date().toISOString(),projectRef:ref,target,modes,events:[]};
  const save = () => fs.writeFileSync(evidence,JSON.stringify(proof,null,2));
  const backendRequire = createRequire(path.join(root,'erp/server/nfe/consult.cjs'));
  const axios = backendRequire('axios');
  const faults = createAuthorizedConsultationFaults({target,originalPost:axios.post.bind(axios),onEvent:e=>{proof.events.push({at:new Date().toISOString(),...e});save();}});
  global.fetch = readOnlyFetch(new URL(url).origin,global.fetch.bind(global));
  axios.post = faults.post;
  const {server:fiscalServer} = require('../local-fiscal-dev-server.cjs');
  const bridge = http.createServer((req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
    if (req.method === 'OPTIONS') {res.writeHead(204);res.end();return;}
    if (req.method !== 'POST' || req.headers.origin !== 'http://localhost:5173') {res.writeHead(403);res.end();return;}
    let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>65536)req.destroy();});
    req.on('end',()=>{
      let body;try{body=JSON.parse(raw);}catch{}
      if (!faults.allowsRequest(req.url,body)) {res.writeHead(403);res.end();return;}
      const replay = new PassThrough();
      Object.assign(replay,{url:req.url,method:req.method,headers:req.headers,socket:req.socket});
      fiscalServer.emit('request',replay,res);replay.end(raw);
    });
  });
  bridge.listen(3002,'127.0.0.1',()=>{save();console.log(JSON.stringify({ready:true,port:3002,environment:2,documentId:target.documentId,consultationOnly:true}));});
}
if (require.main === module) main().catch(error=>{console.error(/^[A-Z_]+$/.test(error.message)?error.message:'CONSULTATION_FAULT_PREFLIGHT_FAILED');process.exitCode=1;});
module.exports = {createAuthorizedConsultationFaults,readOnlyFetch};
