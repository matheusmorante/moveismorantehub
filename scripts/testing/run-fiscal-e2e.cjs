const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');
const vercelConfigPath = path.join(projectRoot, '.vercel', 'project.json');
const vercelEnvCwd = path.join(projectRoot, '.vercel');
const mode = process.argv[2];

if (!['simulated', 'hml'].includes(mode)) {
  process.stderr.write('Use `npm run test:e2e:fiscal:simulated` or `npm run test:e2e:fiscal:hml`.\n');
  process.exit(2);
}

if (!fs.existsSync(vercelConfigPath)) {
  process.stderr.write('Vercel Development não está vinculado neste checkout.\n');
  process.exit(1);
}

const { projectId, orgId } = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
if (!projectId || !orgId) {
  process.stderr.write('O vínculo Vercel não tem project ID ou organization ID.\n');
  process.exit(1);
}

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = [
  '-y',
  'vercel',
  'env',
  'run',
  '-e',
  'development',
  '--cwd',
  `"${vercelEnvCwd}"`,
  '--',
  process.execPath,
  path.join(__dirname, 'run-fiscal-e2e-in-env.cjs'),
  mode,
];
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/^(?:NFE_|NFCE_|SEFAZ_|SUPABASE_|VITE_|FISCAL_E2E_|E2E_|NODE_EXTRA_CA_CERTS$|NODE_TLS_REJECT_UNAUTHORIZED$)/.test(key)) {
    delete env[key];
  }
}
env.VERCEL_PROJECT_ID = projectId;
env.VERCEL_ORG_ID = orgId;

const child = spawn(executable, args, {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  windowsHide: true,
});

child.on('error', () => {
  process.stderr.write('Não foi possível iniciar Vercel Development para os testes fiscais.\n');
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code || 0;
});

