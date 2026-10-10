// Diagnostics only: captures sanitized metadata, never transmits or reserves invoices.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const link = JSON.parse(fs.readFileSync(path.join(root, '.vercel/project.json'), 'utf8'));
const auditDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const out = path.join(root, `docs/audits/fiscal-${auditDate}/evidence`);
fs.mkdirSync(out, {recursive:true});
require(path.join(root,'erp/node_modules/esbuild')).buildSync({
  entryPoints:[path.join(root,'scripts/testing/fiscal-audit.ts')],bundle:true,platform:'node',
  target:'node22',format:'cjs',packages:'external',outfile:path.join(root,'erp/server/nfe/fiscal-audit.cjs'),
});

async function run(environment, args, name, cwd = path.join(root,'.vercel')) {
  const env = {...process.env};
  for (const key of Object.keys(env)) {
    if (/^(?:NFE_|NFCE_|SEFAZ_|SUPABASE_|VITE_|NODE_EXTRA_CA_CERTS$|NODE_TLS_REJECT_UNAUTHORIZED$)/.test(key)) delete env[key];
  }
  if (name === 'development-operator-preflight' || name === 'development-guard-readiness') {
    env.VERCEL_ENV = 'development';
    env.MORANTE_ENV_SOURCE = 'vercel-development';
  }
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const cli = ['-y','vercel','env','run','-e',environment,'--project',link.projectId,
    '--scope','matheusmorantes-projects','--cwd',cwd,'--','node',path.join(root,'erp/server/nfe/fiscal-audit.cjs'),...args];
  return await new Promise(resolve => {
    const child = spawn(executable,cli,{cwd:root,env,windowsHide:true,shell:process.platform==='win32'});
    let stdout = ''; let stderr = '';
    child.stdout.on('data', data => {stdout += data;});
    child.stderr.on('data', data => {stderr += data;});
    child.on('error', () => resolve({name,exitCode:1,error:'PROCESS_START_FAILED'}));
    child.on('exit', code => {
      const records = stdout.split(/\r?\n/).filter(line => line.startsWith('{')).map(line => JSON.parse(line));
      const result = {name,environment,exitCode:code,records};
      if (!records.length) result.error = /not.*auth|forbidden|token/i.test(stderr) ? 'CLI_AUTH_OR_SCOPE_FAILED' : 'CLI_FAILED_NO_EVIDENCE';
      fs.writeFileSync(path.join(out,`${name}.json`),JSON.stringify(result,null,2)+'\n');
      console.log(JSON.stringify({name,exitCode:code,records:records.length,error:result.error,
        ...(args[0]==='env' && records[0] ? {certLength:records[0].variables?.NFE_CERTIFICATE_BASE64?.length,
          certValid:records[0].certificate?.pkcs12Valid,productionEnabled:records[0].variables?.NFE_PRODUCTION_ENABLED?.value,
          extraCA:records[0].extraCA,supabaseRef:records[0].supabaseRef} : {}),
        ...(args[0]==='operator' && records[0] ? {operatorEmailPresent:records[0].operatorEmailPresent,
          projectMatches:records[0].projectMatches,vercelDevelopment:records[0].vercelDevelopment,
          homologationEnvironment:records[0].homologationEnvironment,productionDisabled:records[0].productionDisabled,
          environmentOk:records[0].environmentOk,
          credentialsPresent:records[0].credentialsPresent,authenticated:records[0].authenticated,
          authenticatedIdentityMatches:records[0].authenticatedIdentityMatches,
          administratorCheckOk:records[0].administratorCheckOk,isAdministrator:records[0].isAdministrator} : {}),
        ...(args[0]==='policy-status' && records[0] ? {projectMatches:records[0].projectMatches,
          vercelDevelopment:records[0].vercelDevelopment,homologationEnvironment:records[0].homologationEnvironment,
          productionDisabled:records[0].productionDisabled,environmentOk:records[0].environmentOk,
          serviceCredentialPresent:records[0].serviceCredentialPresent,rpcHttpStatus:records[0].rpcHttpStatus,
          rpcReachable:records[0].rpcReachable,policyStatusValid:records[0].policyStatusValid,
          ready:records[0].ready,policyVersion:records[0].policyVersion,
          behavioralProofRequired:records[0].behavioralProofRequired} : {}),
        ...(args[0]!=='env' && args[0]!=='operator' && args[0]!=='policy-status' ? {results:records.map(r=>({service:r.service,model:r.model,policy:r.policy,success:r.success,http:r.http,error:r.error,errorCode:r.errorCode,cStat:r.cStat,reason:r.reason}))}:{}),
      }));
      resolve(result);
    });
  });
}
async function main() {
  const mode = process.argv[2] || 'envs';
  const results = [];
  const capture = async (...args) => results.push(await run(...args));
  if (mode === 'openssl') await capture('development',['openssl'],'openssl-hml');
  else if (mode === 'reconcile-http') await capture('development',['reconcile-http'],'existing-attempt-api-reconciliation');
  else if (mode === 'operational') await capture('development',['operational'],`operational-${process.argv[3] === 'after' ? 'after' : 'before'}`);
  else if (mode === 'operator') await capture('development',['operator'],'development-operator-preflight');
  else if (mode === 'policy-status') await capture('development',['policy-status'],'development-guard-readiness');
  else if (mode === 'envs') for (const environment of ['development','preview','production']) await capture(environment,['env',environment],`${environment}-env`);
  else if (mode === 'tls') {
    for (const model of ['55','65']) for (const policy of ['native','erp']) await capture('development',['wsdl',model,policy,'2'],`${model}-${policy}-wsdl`);
  } else if (mode === 'services') {
    for (const model of ['55','65']) await capture('development',['status',model],`${model}-status`);
    for (const model of ['55','65']) await capture('development',['consult',model],`${model}-existing-attempt-consult`);
  } else if (mode === 'production-tls') {
    for (const model of ['55','65']) await capture('production',['wsdl',model,'server-only','1'],`${model}-production-wsdl`);
  } else throw new Error('AUDIT_MODE_INVALID');
  if (results.some(result => result.exitCode !== 0 || !result.records?.length)) process.exitCode = 1;
}
main().catch(()=>{console.error('Fiscal audit failed without evidence.');process.exitCode=1;});
