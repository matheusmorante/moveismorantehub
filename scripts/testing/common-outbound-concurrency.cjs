// Two real PostgreSQL sessions through PostgREST. Only an owned synthetic HML
// counter is touched; this script has no invoice, XML or SEFAZ emission path.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');

async function worker() {
  if (process.env.MORANTE_ENV_SOURCE !== 'vercel-development') throw new Error('DEVELOPMENT_ENV_REQUIRED');
  const { createClient } = require(path.join(root, 'node_modules/@supabase/supabase-js'));
  const ref = fs.readFileSync(path.join(root, 'supabase/.temp/project-ref'), 'utf8').trim();
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || new URL(url).hostname !== `${ref}.supabase.co`) throw new Error('DEVELOPMENT_PROJECT_OR_KEY_UNAVAILABLE');
  const db = createClient(url, key, { db: { retry: false }, auth: { persistSession: false, autoRefreshToken: false } });
  const runId = `TEST_AUT_${randomUUID()}`;
  const issuer = `98${createHash('sha256').update(runId).digest('hex').replace(/\D/g, '').padEnd(12, '0').slice(0, 12)}`;
  const fixture = { issuer_cnpj: issuer, model: '55', environment: 2, series: '886', last_number: 0 };
  const legacy = await db.from('nfe_legacy_sequence_scope').select('issuer_cnpj').eq('issuer_cnpj', issuer).maybeSingle();
  if (legacy.error || legacy.data) throw new Error('SYNTHETIC_ISSUER_NOT_UNUSED');
  const insert = await db.from('nfe_establishment_sequences').insert(fixture);
  if (insert.error) throw new Error('COUNTER_FIXTURE_INSERT_FAILED');
  try {
    console.log(JSON.stringify({ stage: 'ready', runId, projectRef: ref, issuer, model: '55', environment: 2, series: '886' }));
    if (process.argv.includes('--wait-for-start')) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('START_SIGNAL_TIMEOUT')), 60000);
        process.stdin.once('data', () => { clearTimeout(timeout); resolve(); });
        process.stdin.resume();
      });
      process.stdin.pause();
    }
    const reserve = async (workerId) => {
      const startedAt = new Date().toISOString();
      const started = performance.now();
      const args = { p_issuer_cnpj: issuer, p_model: '55', p_environment: 2, p_series: '886', p_minimum: 1, p_expected_number: 1 };
      let result = await db.rpc('reserve_nfe_outbound_number', args).abortSignal(AbortSignal.timeout(20000));
      const conflict = Boolean(result.error?.message?.includes('FISCAL_SEQUENCE_CHANGED'));
      if (conflict) {
        const peek = await db.rpc('peek_nfe_outbound_number', { p_issuer_cnpj: issuer, p_model: '55', p_environment: 2, p_series: '886', p_minimum: 1 }).abortSignal(AbortSignal.timeout(10000));
        if (peek.error) throw new Error('CONCURRENCY_REPEEK_FAILED');
        result = await db.rpc('reserve_nfe_outbound_number', { ...args, p_expected_number: peek.data }).abortSignal(AbortSignal.timeout(10000));
      }
      if (result.error) {
        console.log(JSON.stringify({ stage: 'rpc-error', workerId, casConflict: conflict,
          code: result.error.code, reason: result.error.message?.match(/\b[A-Z][A-Z_]{4,}\b/)?.[0] || 'DATABASE_OR_NETWORK_ERROR' }));
        throw new Error('CONCURRENT_RESERVATION_FAILED');
      }
      return { workerId, startedAt, elapsedMs: Math.round(performance.now() - started), number: result.data, casConflict: conflict };
    };
    const settled = await Promise.allSettled([reserve('A'), reserve('B')]);
    const results = settled.map(result => {
      if (result.status === 'rejected') throw result.reason;
      return result.value;
    });
    if (results.map(r => r.number).sort().join(',') !== '1,2' || results.filter(r => r.casConflict).length !== 1)
      throw new Error('CONCURRENT_RESERVATION_ASSERTION_FAILED');
    console.log(JSON.stringify({ stage: 'passed', runId, projectRef: ref, results, sefazCalls: 0 }));
  } finally {
    const removed = await db.from('nfe_establishment_sequences').delete().eq('issuer_cnpj', issuer).eq('model', '55')
      .eq('environment', 2).eq('series', '886').in('last_number', [0, 1, 2]).select('issuer_cnpj');
    if (removed.error || removed.data?.length !== 1) throw new Error('OWN_COUNTER_FIXTURE_CLEANUP_FAILED');
    console.log(JSON.stringify({ stage: 'cleaned', runId, retainedCounterFixtures: 0 }));
  }
}

function launch() {
  const link = JSON.parse(fs.readFileSync(path.join(root, '.vercel/project.json'), 'utf8'));
  const env = { ...process.env, MORANTE_ENV_SOURCE: 'vercel-development', VERCEL_PROJECT_ID: link.projectId, VERCEL_ORG_ID: link.orgId };
  for (const name of Object.keys(env)) if (/^(?:NFE_|NFCE_|SEFAZ_|SUPABASE_|VITE_|NODE_EXTRA_CA_CERTS$|NODE_TLS_REJECT_UNAUTHORIZED$)/.test(name)) delete env[name];
  const args = ['-y', 'vercel', 'env', 'run', '-e', 'development', '--project', link.projectId, '--scope', link.orgId,
    '--cwd', path.join(root, '.vercel'), '--', 'node', __filename, '--worker', ...process.argv.slice(2)];
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { cwd: root, env, stdio: 'inherit', windowsHide: true, shell: process.platform === 'win32' });
  child.on('error', () => { console.error('DEVELOPMENT_ENV_START_FAILED'); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code || 0; });
}

if (process.argv.includes('--worker')) worker().catch(error => { console.error(/^[A-Z_]+$/.test(error.message) ? error.message : 'CONCURRENCY_TEST_FAILED'); process.exitCode = 1; });
else launch();
