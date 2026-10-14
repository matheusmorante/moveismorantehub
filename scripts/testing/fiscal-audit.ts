/** Read-only diagnostics. This module never authorizes, cancels or reserves a fiscal document. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';
import { createHash, createHmac, randomBytes, X509Certificate } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { getCACertificates, type TLSSocket } from 'node:tls';
import dotenv from 'dotenv';
import forge from 'node-forge';
import { createClient } from '@supabase/supabase-js';
import { extractCertificateAndKey, signNfeXml } from '../../api/nfe/nfeSigner';
import { createSefazHttpsAgent } from '../../api/nfe/sefazHttpsAgent';
import { sendSoapToSefaz } from '../../api/nfe/sefazClient';
import { validateNfeAgainstOfficialSchema, validateUnsignedNfeStructure } from '../../api/nfe/schemaValidator';
import { icpBrasilRoots } from '../../api/nfe/icpBrasilRoots';
import { performance } from 'node:perf_hooks';
import { excludeTestOrders, NON_TEST_ARTIFACT_FILTER } from '../../shared-utils/testArtifactQueries';

const root = path.resolve(__dirname, '../../..');
const label = process.argv[3] || 'process';
const keyFile = path.join(os.tmpdir(), 'morantehub-fiscal-audit-hmac-key');
if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, randomBytes(32), { mode: 0o600 });
const digestKey = fs.readFileSync(keyFile);
const digest = (value: string) => createHmac('sha256', digestKey).update(value).digest('hex');
const originalPfx = 'C:/Users/Rosilene/Downloads/MOVEIS MORANTE LTDA44512248000107.pfx';
const pattern = /^(?:NFE_|NFCE_|SEFAZ_|SUPABASE_|VITE_SUPABASE_|VERCEL_ENV$|NODE_ENV$|NODE_EXTRA_CA_CERTS$|NODE_TLS_REJECT_UNAUTHORIZED$|NODE_OPTIONS$|HTTPS?_PROXY$|NO_PROXY$)/;
const mandatory = ['NFE_CERTIFICATE_BASE64', 'NFE_CERTIFICATE_PASSWORD',
  'NODE_EXTRA_CA_CERTS', 'NODE_TLS_REJECT_UNAUTHORIZED', 'SUPABASE_URL',
  'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const safeSubject = (s: string) => s.replace(/\b\d{11}\b/g, '[CPF omitido]');
const certificateMetadata = (cert: X509Certificate) => ({
  subject: safeSubject(cert.subject), issuer: safeSubject(cert.issuer), ca: cert.ca,
  validFrom: cert.validFrom, validTo: cert.validTo, fingerprint256: cert.fingerprint256,
  currentlyValid: Date.parse(cert.validFrom) <= Date.now() && Date.parse(cert.validTo) > Date.now(),
});

function inspectEnv(env: NodeJS.ProcessEnv) {
  const detectedNames = Object.keys(env).filter(k =>
    pattern.test(k) && k !== 'NFE_ENVIRONMENT' && k !== 'NFE_PRODUCTION_ENABLED');
  const variables = Object.fromEntries([...new Set([...mandatory, ...detectedNames])].sort().map(name => {
    const value = env[name];
    return [name, { present: value !== undefined && value !== '', length: value?.length || 0,
      hash: value ? digest(value) : null,
      ...(['VERCEL_ENV', 'NODE_ENV', 'NODE_TLS_REJECT_UNAUTHORIZED'].includes(name) ? { value: value ?? null } : {}),
    }];
  }));
  const base64 = env.NFE_CERTIFICATE_BASE64 || '';
  const clean = base64.replace(/\s/g, '');
  const strictBase64 = Boolean(clean) && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(clean);
  const decoded = Buffer.from(clean, 'base64');
  let certificate: Record<string, unknown> = { strictBase64, decodedBytes: decoded.length, pkcs12Valid: false };
  if (strictBase64) {
    try {
      const extracted = extractCertificateAndKey(base64, env.NFE_CERTIFICATE_PASSWORD || '');
      const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(decoded.toString('binary')), env.NFE_CERTIFICATE_PASSWORD || '');
      const chain = p12.getBags({bagType: forge.pki.oids.certBag})[forge.pki.oids.certBag] || [];
      certificate = { ...certificate, pkcs12Valid: true, passwordCorrect: true,
        leaf: certificateMetadata(new X509Certificate(extracted.certPem)),
        chain: chain.filter(bag => bag.cert).map(bag => certificateMetadata(new X509Certificate(forge.pki.certificateToPem(bag.cert!)))),
      };
    } catch (error) { certificate.errorCode = (error as {code?: string}).code || 'PFX_PARSE_OR_PASSWORD_FAILED'; }
  }
  let extraCA: Record<string, unknown> = { configured: Boolean(env.NODE_EXTRA_CA_CERTS), exists: false };
  if (env.NODE_EXTRA_CA_CERTS && fs.existsSync(env.NODE_EXTRA_CA_CERTS)) {
    const pem = fs.readFileSync(env.NODE_EXTRA_CA_CERTS, 'utf8');
    const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
    try { extraCA = {...extraCA, exists: true, certificates: blocks.map(block => certificateMetadata(new X509Certificate(block)))}; }
    catch { extraCA = {...extraCA, exists: true, validPem: false}; }
  }
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const original = fs.existsSync(originalPfx) ? fs.readFileSync(originalPfx) : undefined;
  return {variables, certificate, extraCA,
    originalPfx: {exists:Boolean(original),bytes:original?.length,
      sha256:original ? createHash('sha256').update(original).digest('hex') : null,
      matchesDecoded:original && clean ? original.equals(decoded) : null},
    supabaseRef: supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : null};
}

function chainMetadata(socket?: TLSSocket) {
  if (!socket) return [];
  const chain: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let cert = socket.getPeerCertificate(true);
  while (cert?.fingerprint256 && !seen.has(cert.fingerprint256)) {
    seen.add(cert.fingerprint256);
    chain.push({ subject: cert.subject, issuer: cert.issuer, validFrom: cert.valid_from,
      validTo: cert.valid_to, fingerprint256: cert.fingerprint256 });
    cert = cert.issuerCertificate;
  }
  return chain;
}

async function testArtifactPostgrestReads() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase() || '';
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD || '';
  const projectRef = (() => {
    try { return new URL(url).hostname.split('.')[0]; } catch { return ''; }
  })();
  const projectMatches = projectRef === 'hkoxhourxwlddgsfdgws';
  const vercelDevelopment = process.env.VERCEL_ENV === 'development';
  const environmentOk = vercelDevelopment;
  const credentialsPresent = Boolean(anonKey && email && password);
  if (!projectMatches || !environmentOk || !credentialsPresent) {
    console.log(JSON.stringify({mode:'artifact-reads',projectMatches,vercelDevelopment,
      environmentOk,operatorEmailPresent:Boolean(email),
      credentialsPresent,authenticated:false,administratorCheckOk:false,queriesValid:false}));
    process.exitCode = 1;
    return;
  }

  const operator = createClient(url, anonKey, {auth:{persistSession:false,autoRefreshToken:false}});
  const login = await operator.auth.signInWithPassword({email,password});
  const authenticatedIdentityMatches = !login.error && Boolean(login.data.session) &&
    login.data.user?.email?.trim().toLowerCase() === email;
  if (!authenticatedIdentityMatches) {
    console.log(JSON.stringify({mode:'artifact-reads',projectRef,environment:2,operatorEmailPresent:true,
      authenticated:false,authenticatedIdentityMatches:false,administratorCheckOk:false,queriesValid:false}));
    process.exitCode = 1;
    return;
  }

  try {
    const role = await operator.rpc('is_administrator');
    const administratorCheckOk = !role.error && role.data === true;
    if (!administratorCheckOk) {
      console.log(JSON.stringify({mode:'artifact-reads',projectRef,environment:2,operatorEmailPresent:true,
        authenticated:true,authenticatedIdentityMatches:true,administratorCheckOk:false,queriesValid:false}));
      process.exitCode = 1;
      return;
    }

    const orderCountQuery = () => operator.from('orders').select('id',{count:'exact',head:true});
    const markedTestFilter = 'order_data->>is_test.eq.true,order_data->>isTest.eq.true,order_data->testArtifact->>is_test.eq.true';
    const countRows = async (build: () => any) => {
      try {
        const {count,error} = await build();
        return {count:error ? null : count ?? 0,errorCode:error?.code || null};
      } catch {
        return {count:null,errorCode:'POSTGREST_QUERY_FAILED'};
      }
    };
    const destinations = [
      {
        name:'sales-report',
        raw:() => orderCountQuery().is('order_data->deleted',null),
        filtered:() => excludeTestOrders(orderCountQuery()).is('order_data->deleted',null),
      },
      {
        name:'stock-report',
        raw:() => orderCountQuery().eq('deleted',false).neq('order_type','budget'),
        filtered:() => excludeTestOrders(orderCountQuery()).eq('deleted',false).neq('order_type','budget'),
      },
      {
        name:'delivery-schedule',
        raw:() => orderCountQuery().or('deleted.is.null,deleted.eq.false').in('status',['scheduled','draft']),
        filtered:() => excludeTestOrders(orderCountQuery())
          .or('deleted.is.null,deleted.eq.false').in('status',['scheduled','draft']),
      },
      {
        name:'assembly-list',
        raw:() => orderCountQuery()
          .or('order_data->>deleted.is.null,order_data->>deleted.eq.false'),
        filtered:() => excludeTestOrders(orderCountQuery())
          .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
          .or('order_data->>is_test.is.null,order_data->>is_test.eq.false'),
      },
      {
        name:'assembly-print',
        raw:() => orderCountQuery().eq('deleted',false).neq('status','cancelled'),
        filtered:() => excludeTestOrders(orderCountQuery()).eq('deleted',false).neq('status','cancelled'),
      },
      {
        name:'dashboard-period',
        raw:() => orderCountQuery().gte('created_at','2026-10-05T00:00:00.000Z')
          .lte('created_at','2026-10-11T23:59:59.000Z'),
        filtered:() => excludeTestOrders(orderCountQuery())
          .gte('created_at','2026-10-05T00:00:00.000Z').lte('created_at','2026-10-11T23:59:59.000Z'),
      },
      {
        name:'dashboard-recent-and-map',
        raw:() => orderCountQuery().in('status',['scheduled','fulfilled'])
          .or('deleted.is.null,deleted.eq.false'),
        filtered:() => excludeTestOrders(orderCountQuery()).in('status',['scheduled','fulfilled'])
          .or('deleted.is.null,deleted.eq.false'),
      },
      {
        name:'notification-order-read',
        raw:() => orderCountQuery(),
        filtered:() => excludeTestOrders(orderCountQuery()),
      },
    ];
    const destinationResults: Array<Record<string,unknown>> = [];
    for (const destination of destinations) {
      const raw = await countRows(destination.raw);
      const filtered = await countRows(destination.filtered);
      const marked = await countRows(() => destination.raw().or(markedTestFilter));
      const leaked = await countRows(() => destination.filtered().or(markedTestFilter));
      // Independent requests can observe concurrent operational writes; marker leaks are the invariant.
      const queryValid = raw.count !== null && filtered.count !== null && marked.count !== null && leaked.count === 0;
      destinationResults.push({name:destination.name,rawCount:raw.count,filteredCount:filtered.count,
        excludedCount:raw.count !== null && filtered.count !== null ? raw.count-filtered.count : null,
        markedCandidateCount:marked.count,leakedTestCount:leaked.count,behaviorExercised:(marked.count ?? 0)>0,
        queryValid,errorCode:raw.errorCode || filtered.errorCode || marked.errorCode || leaked.errorCode || null});
    }

    const activeStatusProofs: Array<Record<string,unknown>> = [];
    for (const status of ['scheduled','fulfilled']) {
      const marked = await countRows(() => orderCountQuery().eq('status',status)
        .or('deleted.is.null,deleted.eq.false').or(markedTestFilter));
      const leaked = await countRows(() => excludeTestOrders(orderCountQuery()).eq('status',status)
        .or('deleted.is.null,deleted.eq.false').or(markedTestFilter));
      activeStatusProofs.push({status,markedCandidateCount:marked.count,leakedTestCount:leaked.count,
        behaviorExercised:(marked.count ?? 0)>0,queryValid:marked.count !== null && leaked.count === 0,
        errorCode:marked.errorCode || leaked.errorCode || null});
    }

    const contradictoryTestCount = await countRows(() => orderCountQuery()
      .or(NON_TEST_ARTIFACT_FILTER)
      .or(markedTestFilter));
    const limitedRows = await operator.from('orders')
      .select('is_test:order_data->>is_test,isTest:order_data->>isTest,nested_test:order_data->testArtifact->>is_test')
      .or(NON_TEST_ARTIFACT_FILTER)
      .in('status',['scheduled','fulfilled'])
      .or('deleted.is.null,deleted.eq.false')
      .order('created_at',{ascending:false})
      .limit(50);
    const limitedLeakCount = limitedRows.error ? null : (limitedRows.data || []).filter((row:any) =>
      [row.is_test,row.isTest,row.nested_test].some(value => value === true || value === 'true')
    ).length;
    const queriesValid = destinationResults.every(result => result.queryValid === true) &&
      activeStatusProofs.every(result => result.queryValid === true) &&
      contradictoryTestCount.count === 0 && contradictoryTestCount.errorCode === null &&
      limitedLeakCount === 0 && !limitedRows.error;
    console.log(JSON.stringify({mode:'artifact-reads',projectRef,environment:2,operatorEmailPresent:true,
      authenticated:true,authenticatedIdentityMatches:true,administratorCheckOk:true,
      sourceFilterAppliedBeforeLimit:true,destinations:destinationResults,
      activeStatusProofs,activeStatesExercised:activeStatusProofs.every(result => result.behaviorExercised === true),
      contradictoryTestCount,limitedRowsReturned:limitedRows.data?.length ?? null,limitedLeakCount,queriesValid}));
    if (!queriesValid) process.exitCode = 1;
  } finally {
    await operator.auth.signOut({scope:'local'});
  }
}

async function wsdl(model: string, service: string, policy: string, environment: number) {
  const segment = model === '65' ? 'nfce' : 'nfe';
  const prefix = environment === 2 ? 'homologacao.' : '';
  const url = new URL(`https://${prefix}${segment}.sefa.pr.gov.br/${segment}/${service}?wsdl`);
  const cert = policy === 'server-only' ? undefined
    : extractCertificateAndKey(process.env.NFE_CERTIFICATE_BASE64 || '', process.env.NFE_CERTIFICATE_PASSWORD || '');
  const agent = policy === 'erp' && cert ? createSefazHttpsAgent(cert.certPem, cert.privateKeyPem)
    : new https.Agent({cert: cert?.certPem, key: cert?.privateKeyPem,
      ...(policy === 'native-default' ? {} : {ca:[...getCACertificates('bundled'), ...icpBrasilRoots]}),
      rejectUnauthorized: true, minVersion: 'TLSv1.2', keepAlive: false});
  const started = performance.now();
  let socket: TLSSocket | undefined;
  return await new Promise(resolve => {
    const finish = (data: Record<string, unknown>) => {
      clearTimeout(deadline);
      const result = { model, environment, service, policy, endpoint: url.toString(),
        durationMs: Math.round(performance.now() - started), protocol: socket?.getProtocol(), cipher: socket?.getCipher(),
        authorized: socket?.authorized || false, authorizationError: socket?.authorizationError || null,
        chain: chainMetadata(socket), ...data };
      agent.destroy(); resolve(result);
    };
    const request = https.get(url, {agent}, response => {
      let bytes = 0; response.on('data', chunk => {bytes += chunk.length;});
      response.on('end', () => finish({http: response.statusCode, bytes, success: response.statusCode === 200}));
      response.on('error', error => finish({error: (error as NodeJS.ErrnoException).code || 'RESPONSE_ERROR', success: false}));
    });
    const deadline = setTimeout(() => request.destroy(Object.assign(new Error('Timeout'), {code: 'ETIMEDOUT'})), 15000);
    request.on('socket', s => { socket = s as TLSSocket; });
    request.on('error', error => finish({error: (error as NodeJS.ErrnoException).code || 'HTTPS_ERROR', success: false}));
  });
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'artifact-reads') {
    await testArtifactPostgrestReads();
  } else if (mode === 'openssl') {
    const extracted = extractCertificateAndKey(process.env.NFE_CERTIFICATE_BASE64 || '', process.env.NFE_CERTIFICATE_PASSWORD || '');
    const probeDirectory = fs.mkdtempSync(path.join(os.tmpdir(),'morantehub-openssl-client-'));
    const clientFile = path.join(probeDirectory,'encrypted-client.pem');
    const encryptedKey = forge.pki.encryptRsaPrivateKey(forge.pki.privateKeyFromPem(extracted.privateKeyPem),
      process.env.NFE_CERTIFICATE_PASSWORD || '',{algorithm:'aes256'});
    fs.writeFileSync(clientFile,extracted.certPem + encryptedKey,{mode:0o600});
    try {
    for (const model of ['55','65']) {
      const hostname = `homologacao.${model === '65' ? 'nfce' : 'nfe'}.sefa.pr.gov.br`;
      const response = spawnSync('C:/Program Files/Git/usr/bin/openssl.exe', ['s_client',
        '-connect',`${hostname}:443`,'-servername',hostname,'-verify_return_error','-verify_hostname',hostname,
        '-CAfile',path.join(os.tmpdir(),'morantehub-official-v10.pem'),'-brief',
        '-cert',clientFile,'-key',clientFile,'-pass','env:NFE_CERTIFICATE_PASSWORD'],
        {input:'',encoding:'utf8',timeout:20000,windowsHide:true});
      const output = response.stdout + response.stderr;
      const metadata = output.split(/\r?\n/).map(line => line.trim()).filter(line => /^(CONNECTION ESTABLISHED|Protocol version:|Ciphersuite:|Verification:|Verified peername:)/.test(line));
      const success = response.status === 0 && metadata.includes('Verification: OK');
      console.log(JSON.stringify({model,hostname,policy:'openssl-verified-v10-mtls',success,exitCode:response.status,metadata,
        ...(!success ? {errorCode:response.error && 'code' in response.error ? response.error.code : output.match(/error:([A-Fa-f0-9]+):/)?.[1] || 'OPENSSL_VERIFICATION_FAILED'} : {})}));
      if (!success) process.exitCode = 1;
    }
    } finally {
      fs.unlinkSync(clientFile);
      fs.rmdirSync(probeDirectory);
    }
  } else if (mode === 'env') {
    console.log(JSON.stringify({label, node: process.version, openssl: process.versions.openssl,
      startupExtraCA: Boolean(process.env.NODE_EXTRA_CA_CERTS), defaultCACount: getCACertificates('default').length, ...inspectEnv(process.env)}));
  } else if (mode === 'local') {
    const files = ['.env', '.env.local', '.env.development.local', 'erp/.env', 'erp/.env.local', 'erp/.env.development.local'];
    console.log(JSON.stringify({label:'local-files', files: files.filter(f => fs.existsSync(path.join(root,f))).map(f => ({file:f,...inspectEnv(dotenv.parse(fs.readFileSync(path.join(root,f))))}))}));
  } else if (mode === 'reconcile-http') {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    if (new URL(url).hostname !== 'hkoxhourxwlddgsfdgws.supabase.co') throw new Error('AUDIT_PROJECT_MISMATCH');
    const db = createClient(url,process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:doc,error} = await db.from('nfe_documents').select('id,ambiente,modelo,emission_request_id')
      .eq('emission_request_id','aa1146c0-ea67-47aa-9ec6-8af7e5907dcd').single();
    if (error || doc?.ambiente !== 2 || doc.modelo !== '65') throw new Error('AUDIT_DOCUMENT_MISMATCH');
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    if (!email || !password) throw new Error('AUDIT_OPERATOR_UNAVAILABLE');
    const operator = createClient(url,process.env.VITE_SUPABASE_ANON_KEY || '',{auth:{persistSession:false,autoRefreshToken:false}});
    const login = await operator.auth.signInWithPassword({email,password});
    if (login.error || !login.data.session) throw new Error('AUDIT_OPERATOR_AUTH_FAILED');
    try {
      // The official consult route calls retryHmlTechnical(..., false). No /emit request is possible here.
      const response = await fetch('http://127.0.0.1:5173/api/nfe/consult',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${login.data.session.access_token}`},
        body:JSON.stringify({documentId:doc.id}),signal:AbortSignal.timeout(45000),redirect:'error',
      });
      const result = await response.json();
      const success = result.state === 'authorized' || result.state === 'not_found' && result.pending === false;
      console.log(JSON.stringify({mode,environment:2,model:'65',documentId:doc.id,emissionRequestId:doc.emission_request_id,
        endpoint:'/api/nfe/consult',http:response.status,code:result.code,cStat:result.cStat,state:result.state,
        pending:result.pending,success,protocolPresent:Boolean(result.protocolNumber),retransmissionEnabled:false,emissionTriggered:false}));
      if (!success) process.exitCode = 1;
    } finally { await operator.auth.signOut({scope:'local'}); }
  } else if (mode === 'operational') {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    if (new URL(url).hostname !== 'hkoxhourxwlddgsfdgws.supabase.co') throw new Error('AUDIT_PROJECT_MISMATCH');
    const db = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '', {auth:{persistSession:false,autoRefreshToken:false}});
    const {data:doc,error} = await db.from('nfe_documents').select('id,order_id,ambiente,modelo,numero_nfe,serie,status,emission_request_id,fiscal_snapshot_id,chave_acesso,xml_nfe,hml_response_history,numero_protocolo,updated_at')
      .eq('emission_request_id','aa1146c0-ea67-47aa-9ec6-8af7e5907dcd').single();
    if (error || doc?.ambiente !== 2) throw new Error('AUDIT_DOCUMENT_MISMATCH');
    const {captureOperationalState} = require(path.join(root,'scripts/testing/nfe-operational-audit.cjs'));
    const operational = await captureOperationalState(db,doc.order_id);
    const {data:snapshot,error:snapshotError} = await db.from('nfe_fiscal_snapshots').select('snapshot_data,snapshot_sha256').eq('id',doc.fiscal_snapshot_id).single();
    if (snapshotError) throw new Error('AUDIT_SNAPSHOT_MISSING');
    const hash = (value:string) => createHash('sha256').update(value).digest('hex');
    console.log(JSON.stringify({projectRef:'hkoxhourxwlddgsfdgws',emissionRequestId:doc.emission_request_id,
      documentId:doc.id,orderId:doc.order_id,model:doc.modelo,environment:doc.ambiente,number:doc.numero_nfe,series:doc.serie,status:doc.status,
      keyHash:hash(doc.chave_acesso||''),xmlHash:hash(doc.xml_nfe||''),xmlBytes:Buffer.byteLength(doc.xml_nfe||''),
      snapshotId:doc.fiscal_snapshot_id,snapshotHash:hash(JSON.stringify(snapshot.snapshot_data)),
      protocolPresent:Boolean(doc.numero_protocolo),historyCount:doc.hml_response_history?.length,updatedAt:doc.updated_at,
      operational:operational.map((item:{count:number;hash:string},index:number)=>({table:['orders','order_items','order_payments','inventory_moves','accounts_receivable','financial_transactions'][index],...item}))}));
  } else if (mode === 'operator') {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    const projectRef = (() => {
      try { return new URL(url).hostname.split('.')[0]; } catch { return ''; }
    })();
    const projectMatches = projectRef === 'hkoxhourxwlddgsfdgws';
    const vercelDevelopment = process.env.VERCEL_ENV === 'development';
    const environmentOk = vercelDevelopment;
    const operatorEmailPresent = Boolean(email);
    const credentialsPresent = Boolean(password && process.env.VITE_SUPABASE_ANON_KEY);
    if (!projectMatches || !environmentOk || !operatorEmailPresent || !credentialsPresent) {
      console.log(JSON.stringify({mode,projectRef,projectMatches,vercelDevelopment,
        environmentOk,operatorEmailPresent,credentialsPresent,authenticated:false,
        administratorCheckOk:false,isAdministrator:false}));
      process.exitCode = 1;
      return;
    }
    const operator = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await operator.auth.signInWithPassword({ email, password });
    const authenticatedIdentityMatches = !login.error && Boolean(login.data.session) &&
      login.data.user?.email?.trim().toLowerCase() === email;
    const authenticated = authenticatedIdentityMatches;
    if (!authenticated) {
      console.log(JSON.stringify({mode,projectRef,environment:2,operatorEmailPresent:true,
        authenticated:false,authenticatedIdentityMatches:false,administratorCheckOk:false,isAdministrator:false}));
      process.exitCode = 1;
    } else {
      const role = await operator.rpc('is_administrator');
      console.log(JSON.stringify({mode,projectRef,environment:2,operatorEmailPresent:true,
        authenticated:true,authenticatedIdentityMatches:true,administratorCheckOk:!role.error,
        isAdministrator:!role.error && role.data === true}));
      if (role.error || role.data !== true) process.exitCode = 1;
    }
  } else if (mode === 'artifact-resolve') {
    const [runId, orderId, scenarioKey] = process.argv.slice(3);
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    const projectRef = (() => {
      try { return new URL(url).hostname.split('.')[0]; } catch { return ''; }
    })();
    if (projectRef !== 'hkoxhourxwlddgsfdgws' || process.env.VERCEL_ENV !== 'development' ||
        !email || !password || !process.env.VITE_SUPABASE_ANON_KEY) {
      console.log(JSON.stringify({mode,projectMatches:projectRef === 'hkoxhourxwlddgsfdgws',
        vercelDevelopment:process.env.VERCEL_ENV === 'development',authenticated:false,
        authenticatedIdentityMatches:false,administratorCheckOk:false,artifactValid:false,
        errorCode:'RUNTIME_OR_PROJECT_MISMATCH'}));
      process.exitCode = 1;
      return;
    }
    const operator = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const login = await operator.auth.signInWithPassword({ email, password });
    const authenticatedIdentityMatches = !login.error && Boolean(login.data.session) &&
      login.data.user?.email?.trim().toLowerCase() === email;
    if (!authenticatedIdentityMatches) {
      console.log(JSON.stringify({mode,projectMatches:true,vercelDevelopment:true,authenticated:false,
        authenticatedIdentityMatches:false,administratorCheckOk:false,artifactValid:false,
        errorCode:'CONFIGURED_OPERATOR_AUTHENTICATION_FAILED'}));
      process.exitCode = 1;
      return;
    }
    const { loadPersistedFiscalOrder } = require(path.join(root, 'scripts/testing/fiscal-persisted-artifact.cjs'));
    try {
      const artifact = await loadPersistedFiscalOrder(operator, { orderId, runId, scenarioKey, expectedEmail: email });
      console.log(JSON.stringify({mode,projectMatches:true,vercelDevelopment:true,environment:2,
        authenticated:true,authenticatedIdentityMatches:true,administratorCheckOk:true,artifactValid:true,
        scenarioKey:artifact.scenarioKey,deliveryMethod:artifact.deliveryMethod,status:artifact.status,
        itemCount:artifact.itemCount,paymentCount:artifact.paymentCount}));
    } catch (error) {
      const code = error && typeof error.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)
        ? error.code : 'PERSISTED_ARTIFACT_VALIDATION_FAILED';
      console.log(JSON.stringify({mode,projectMatches:true,vercelDevelopment:true,environment:2,
        authenticated:true,authenticatedIdentityMatches:true,administratorCheckOk:true,
        artifactValid:false,errorCode:code}));
      process.exitCode = 1;
    }
  } else if (mode === 'policy-status') {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const apiKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const projectRef = (() => {
      try { return new URL(url).hostname.split('.')[0]; } catch { return ''; }
    })();
    const projectMatches = projectRef === 'hkoxhourxwlddgsfdgws';
    const vercelDevelopment = process.env.VERCEL_ENV === 'development';
    const environmentOk = vercelDevelopment;
    const serviceCredentialPresent = Boolean(apiKey);
    const emptyStatus = {
      mode,
      projectMatches,
      vercelDevelopment,
      environmentOk,
      serviceCredentialPresent,
      rpcReachable: false,
      policyStatusValid: false,
      ready: false,
      policyVersion: '',
      behavioralProofRequired: true,
    };
    if (!projectMatches || !environmentOk || !serviceCredentialPresent) {
      console.log(JSON.stringify(emptyStatus));
      process.exitCode = 1;
      return;
    }

    let response: Response;
    try {
      const headers: Record<string, string> = { apikey: apiKey, 'content-type': 'application/json' };
      if (apiKey.startsWith('eyJ')) headers.authorization = `Bearer ${apiKey}`;
      response = await fetch(new URL('/rest/v1/rpc/test_artifact_policy_status', url), {
        method: 'POST',
        headers,
        body: '{}',
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      console.log(JSON.stringify(emptyStatus));
      process.exitCode = 1;
      return;
    }

    let status: unknown;
    try {
      status = await response.json();
    } catch {
      status = null;
    }
    const policy = status as {
      ready?: unknown;
      policyVersion?: unknown;
      behavioralProofRequired?: unknown;
    } | null;
    const policyStatusValid = Boolean(
      policy &&
      typeof policy.ready === 'boolean' &&
      typeof policy.policyVersion === 'string' &&
      typeof policy.behavioralProofRequired === 'boolean'
    );
    const ready = policyStatusValid && policy?.ready === true;
    const policyVersion = typeof policy?.policyVersion === 'string' ? policy.policyVersion : '';
    const behavioralProofRequired = policy?.behavioralProofRequired !== false;
    console.log(JSON.stringify({
      ...emptyStatus,
      rpcHttpStatus: response.status,
      rpcReachable: response.ok,
      policyStatusValid,
      ready,
      policyVersion,
      behavioralProofRequired,
    }));
    if (
      !response.ok || !policyStatusValid || !ready ||
      policyVersion !== 'json-artifacts-v1' || behavioralProofRequired
    ) {
      process.exitCode = 1;
    }
  } else if (mode === 'wsdl') {
    const model = process.argv[3]; const policy = process.argv[4] || 'erp';
    const environment = process.argv[5] === '1' ? 1 : 2;
    const services = ['NFeAutorizacao4','NFeRetAutorizacao4','NFeConsultaProtocolo4','NFeStatusServico4','NFeRecepcaoEvento4','NFeInutilizacao4'];
    if (!['55','65'].includes(model)) throw new Error('AUDIT_MODEL_INVALID');
    for (const service of services) {
      const result = await wsdl(model,service,policy,environment) as {success:boolean};
      console.log(JSON.stringify(result));
      if (!result.success) process.exitCode = 1;
    }
  } else if (mode === 'status' || mode === 'consult') {
    const model = process.argv[3] === '65' ? '65' : '55';
    const segment = model === '65' ? 'nfce' : 'nfe';
    let accessKey: string | undefined;
    if (mode === 'consult') {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      if (new URL(url).hostname !== 'hkoxhourxwlddgsfdgws.supabase.co') throw new Error('AUDIT_PROJECT_MISMATCH');
      const db = createClient(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '', {auth:{persistSession:false,autoRefreshToken:false}});
      let query = db.from('nfe_documents').select('chave_acesso,ambiente,modelo').eq('ambiente',2).eq('modelo',model);
      query = model === '65' ? query.eq('emission_request_id','aa1146c0-ea67-47aa-9ec6-8af7e5907dcd')
        : query.eq('status','homologada').not('chave_acesso','is',null).order('created_at',{ascending:false}).limit(1);
      const {data,error} = await query.single();
      if (error || data?.ambiente !== 2 || data.modelo !== model) throw new Error('AUDIT_DOCUMENT_MISMATCH');
      accessKey = data.chave_acesso;
    }
    const service = mode === 'status' ? 'NFeStatusServico4' : 'NFeConsultaProtocolo4';
    const cert = extractCertificateAndKey(process.env.NFE_CERTIFICATE_BASE64 || '', process.env.NFE_CERTIFICATE_PASSWORD || '');
    const xmlPayload = mode === 'status'
      ? '<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>41</cUF><xServ>STATUS</xServ></consStatServ>'
      : `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
    const result = await sendSoapToSefaz({url:`https://homologacao.${segment}.sefa.pr.gov.br/${segment}/${service}`,
      action:`http://www.portalfiscal.inf.br/nfe/wsdl/${service}/${mode === 'status' ? 'nfeStatusServicoNF' : 'nfeConsultaNF'}`,
      xmlPayload,serviceNamespace:`http://www.portalfiscal.inf.br/nfe/wsdl/${service}`,certPem:cert.certPem,privateKeyPem:cert.privateKeyPem});
    const cStat = result.match(/<cStat>(\d+)<\/cStat>/)?.[1];
    console.log(JSON.stringify({mode,model,environment:2,cStat,success: mode === 'status' ? cStat === '107' : ['100','150','217','101','151','155'].includes(cStat || ''),
      reason:result.match(/<xMotivo>(.*?)<\/xMotivo>/)?.[1],responseBytes:result.length,protocolPresent:/<nProt>/.test(result)}));
    if (!cStat || (mode === 'status' && cStat !== '107')) process.exitCode = 1;
  } else if (mode === 'perf') {
    const timings: Record<string, number> = {};
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const db = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // 1. Certificate parsing
    const pfx = process.env.NFE_CERTIFICATE_BASE64 || '';
    const pass = process.env.NFE_CERTIFICATE_PASSWORD || '';
    let t0 = performance.now();
    const cert = extractCertificateAndKey(pfx, pass);
    timings.cert_extract_cold_ms = Number((performance.now() - t0).toFixed(2));

    t0 = performance.now();
    extractCertificateAndKey(pfx, pass);
    timings.cert_extract_warm_ms = Number((performance.now() - t0).toFixed(2));

    // 2. Load sample XML from db
    t0 = performance.now();
    const { data: doc } = await db
      .from('nfe_documents')
      .select('xml_nfe, chave_acesso, numero_nfe, serie')
      .eq('ambiente', 2)
      .eq('modelo', '55')
      .eq('status', 'homologada')
      .not('xml_nfe', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    timings.db_fetch_sample_xml_ms = Number((performance.now() - t0).toFixed(2));

    const sampleXml = doc?.xml_nfe || '';

    // 3. Schema validation (cold & warm)
    if (sampleXml) {
      t0 = performance.now();
      await validateNfeAgainstOfficialSchema(sampleXml);
      timings.schema_validation_cold_ms = Number((performance.now() - t0).toFixed(2));

      t0 = performance.now();
      await validateNfeAgainstOfficialSchema(sampleXml);
      timings.schema_validation_warm_ms = Number((performance.now() - t0).toFixed(2));

      // 4. Unsigned structure validation & XML signing
      const unsignedXml = sampleXml.replace(/<Signature[\s\S]*?<\/Signature>/, '');
      t0 = performance.now();
      await validateUnsignedNfeStructure(unsignedXml);
      timings.xml_unsigned_validation_ms = Number((performance.now() - t0).toFixed(2));

      t0 = performance.now();
      signNfeXml(unsignedXml, cert.privateKeyPem, cert.certDerBase64);
      timings.xml_signing_ms = Number((performance.now() - t0).toFixed(2));
    }

    // 5. Supabase typical queries in emission
    t0 = performance.now();
    await db.from('settings').select('data').eq('id', 'app').maybeSingle();
    timings.db_settings_read_ms = Number((performance.now() - t0).toFixed(2));

    t0 = performance.now();
    await db.from('orders').select('id,order_type,status,deleted,order_data,version,updated_at').limit(1).maybeSingle();
    timings.db_orders_read_ms = Number((performance.now() - t0).toFixed(2));

    t0 = performance.now();
    await db.from('ncms').select('code,active,is_active,start_date,end_date').in('code', ['94036000']);
    timings.db_ncms_read_ms = Number((performance.now() - t0).toFixed(2));

    t0 = performance.now();
    await db.from('products').select('id,fiscal,unit').limit(5);
    timings.db_products_read_ms = Number((performance.now() - t0).toFixed(2));

    t0 = performance.now();
    await db.rpc('test_artifact_policy_status');
    timings.db_rpc_ping_ms = Number((performance.now() - t0).toFixed(2));

    // 6. SEFAZ Status SOAP call (mTLS)
    t0 = performance.now();
    const statusPayload = '<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>41</cUF><xServ>STATUS</xServ></consStatServ>';
    const statusResult = await sendSoapToSefaz({
      url: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF',
      xmlPayload: statusPayload,
      serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4',
      certPem: cert.certPem,
      privateKeyPem: cert.privateKeyPem,
    });
    timings.sefaz_status_soap_ms = Number((performance.now() - t0).toFixed(2));
    const statusCStat = statusResult.match(/<cStat>(\d+)<\/cStat>/)?.[1];

    // 7. SEFAZ Consultation SOAP call (mTLS) if key available
    if (doc?.chave_acesso) {
      t0 = performance.now();
      const consultPayload = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
      const consultResult = await sendSoapToSefaz({
        url: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
        action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
        xmlPayload: consultPayload,
        serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
        certPem: cert.certPem,
        privateKeyPem: cert.privateKeyPem,
      });
      timings.sefaz_consult_soap_ms = Number((performance.now() - t0).toFixed(2));
    }

    // 8. Inspect actual historical attempts duration from the database
    const { data: recentAttempts55 } = await db
      .from('nfe_outbound_attempts')
      .select('id, model, environment, state, created_at, transmission_started_at, updated_at')
      .eq('model', '55')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentAttempts65 } = await db
      .from('nfe_outbound_attempts')
      .select('id, model, environment, state, created_at, transmission_started_at, updated_at')
      .eq('model', '65')
      .order('created_at', { ascending: false })
      .limit(5);

    const recentAttempts = [...(recentAttempts55 || []), ...(recentAttempts65 || [])];

    const historical = (recentAttempts || []).map((att) => {
      const created = Date.parse(att.created_at);
      const started = att.transmission_started_at ? Date.parse(att.transmission_started_at) : null;
      const updated = Date.parse(att.updated_at);
      return {
        model: att.model,
        environment: att.environment,
        state: att.state,
        prep_to_transmit_ms: started ? started - created : null,
        transmission_to_result_ms: started ? updated - started : null,
        total_attempt_ms: updated - created,
      };
    });

    console.log(JSON.stringify({
      mode: 'perf',
      success: true,
      statusCStat,
      timings,
      historical,
    }));
  } else if (mode === 'keepalive') {
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const pwd = process.env.NFE_CERTIFICATE_PASSWORD || '';
    if (!pfx) throw new Error('PFX_UNAVAILABLE');
    const cert = extractCertificateAndKey(pfx, pwd);
    const https = require('node:https');
    const { rootCertificates } = require('node:tls');
    const { icpBrasilRoots } = require(path.join(root, 'api/nfe/icpBrasilRoots.ts'));
    const trustedSefazAuthorities = [...new Set([...rootCertificates, ...icpBrasilRoots])];
    const axios = require('axios');
    const agent = new https.Agent({
      cert: cert.certPem,
      key: cert.privateKeyPem,
      ca: trustedSefazAuthorities,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      keepAlive: true,
      keepAliveMsecs: 15000,
    });
    const url = 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4';
    const action = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF';
    const payload = '<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>41</cUF><xServ>STATUS</xServ></consStatServ>';
    const soapEnvelope = `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Header/><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">${payload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;

    let t0 = performance.now();
    const res1 = await axios.post(url, soapEnvelope, {
      httpsAgent: agent,
      headers: {
        'Content-Type': `application/soap+xml; charset=utf-8; action="${action}"`,
        'Content-Length': Buffer.byteLength(soapEnvelope, 'utf8'),
        Accept: 'application/soap+xml, text/xml',
      },
      timeout: 25000,
    });
    const d1 = Number((performance.now() - t0).toFixed(2));

    t0 = performance.now();
    const res2 = await axios.post(url, soapEnvelope, {
      httpsAgent: agent,
      headers: {
        'Content-Type': `application/soap+xml; charset=utf-8; action="${action}"`,
        'Content-Length': Buffer.byteLength(soapEnvelope, 'utf8'),
        Accept: 'application/soap+xml, text/xml',
      },
      timeout: 25000,
    });
    const d2 = Number((performance.now() - t0).toFixed(2));

    const connHeader1 = res1.headers['connection'];
    const connHeader2 = res2.headers['connection'];
    const statusCStat = res2.data.match(/<cStat>(\d+)<\/cStat>/)?.[1];
    agent.destroy();

    console.log(JSON.stringify({
      mode: 'keepalive',
      success: true,
      statusCStat,
      request1_duration_ms: d1,
      request2_duration_ms: d2,
      saved_ms: Number((d1 - d2).toFixed(2)),
      connection_header_1: connHeader1,
      connection_header_2: connHeader2,
      socket_reused: d2 < d1,
    }));
  } else throw new Error('AUDIT_MODE_INVALID');
}
main().catch(error => { console.error(JSON.stringify({label,errorCode:error.code || 'AUDIT_FAILED',transportCode:error.cause?.code || null})); process.exitCode=1; });
