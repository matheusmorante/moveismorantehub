// One-time provisioning, explicitly separate from fiscal operation as a user.
// Password is generated in memory and written only to Vercel Development via stdin.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const project = JSON.parse(fs.readFileSync(path.join(root, '.vercel', 'project.json')));
  if (project.projectName !== 'morantehub') throw new Error('Vercel project mismatch.');
  const env = dotenv.parse(fs.readFileSync(path.join(root, '.env.local')));
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  if (new URL(url).hostname !== 'hkoxhourxwlddgsfdgws.supabase.co') throw new Error('Supabase project mismatch.');
  const email = 'test.aut.nfe.hml@morantehub.invalid';
  if (env.NFE_HML_TEST_OPERATOR_EMAIL && env.NFE_HML_TEST_OPERATOR_EMAIL !== email)
    throw new Error('An operator is already configured; refusing to replace it.');
  if (env.NFE_HML_TEST_OPERATOR_EMAIL && env.NFE_HML_TEST_OPERATOR_PASSWORD) {
    process.stdout.write('Dedicated operator credentials already configured.\n');
    return;
  }
  const password = crypto.randomBytes(36).toString('base64url');
  const backend = createClient(url, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Admin Auth API only provisions the dedicated identity; it is never the fiscal operator.
  const { data: created, error } = await backend.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: 'TEST_AUT_NFE_HML_OPERATOR', is_nfe_hml_test_operator: true },
  });
  if (error || !created.user) throw new Error('Dedicated account provisioning failed.');
  const operator = createClient(url, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await operator.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.session) throw new Error('Dedicated account authentication failed.');
  const existing = await operator.from('profiles').select('id').eq('id', created.user.id).maybeSingle();
  if (existing.error) throw new Error('Dedicated profile lookup failed.');
  if (!existing.data) {
    const profile = await operator.from('profiles').insert({
      id: created.user.id, email, full_name: 'TEST_AUT_NFE_HML_OPERATOR', role: 'pending', roles: ['pending'],
    });
    if (profile.error) throw new Error('Dedicated profile creation failed.');
  }
  for (const [name, value] of [['NFE_HML_TEST_OPERATOR_EMAIL', email], ['NFE_HML_TEST_OPERATOR_PASSWORD', password]]) {
    const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['--no-install', 'vercel', 'env', 'add', name, 'development', '--yes'], {
        cwd: root, shell: process.platform === 'win32', windowsHide: true,
        input: value, encoding: 'utf8', timeout: 90000, stdio: ['pipe', 'pipe', 'pipe'],
      });
    if (result.status !== 0) throw new Error('Development credential registration failed; CLI output suppressed.');
  }
  process.stdout.write(`dedicatedOperatorId=${created.user.id}\n`);
  process.stdout.write('Operator Auth: OK\nCredentials: Vercel Development only\nProfile: awaiting normal administrator role assignment\n');
}

if (require.main === module) main().catch((error) => {
  process.stderr.write(`FAIL PRECHECK_OPERATOR_AUTH: ${error.message}\n`);
  process.exitCode = 1;
});
