const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, '.vercel', 'project.json'), 'utf8'));
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/^(?:NFE_|NFCE_|SEFAZ_|SUPABASE_|VITE_|NODE_EXTRA_CA_CERTS$|NODE_TLS_REJECT_UNAUTHORIZED$)/.test(key)) delete env[key];
}
env.MORANTE_ENV_SOURCE = 'vercel-development';
env.VERCEL_ENV = 'development';
env.VERCEL_PROJECT_ID = config.projectId;
env.VERCEL_ORG_ID = config.orgId;
const executable = 'npx.cmd';
const args = ['-y', 'vercel', 'env', 'run', '-e', 'development', '--cwd', '.vercel', '--', 'node', '../scripts/testing/.fiscal-ui-check-20261011.cjs'];
const child = spawn(executable, args, { cwd: root, env, stdio: 'inherit', shell: true, windowsHide: true });
child.on('error', () => { process.stderr.write('Vercel Development runner could not start.\n'); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code || 0; });
