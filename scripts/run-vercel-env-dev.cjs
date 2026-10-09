const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const vercelConfigPath = path.join(projectRoot, '.vercel', 'project.json');

if (!fs.existsSync(vercelConfigPath)) {
  process.stderr.write('Vercel project link not found. Run `vercel link` first.\n');
  process.exit(1);
}

const { projectId, orgId } = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
if (!projectId || !orgId) {
  process.stderr.write('Vercel project or organization ID is missing from .vercel/project.json.\n');
  process.exit(1);
}

const vercelEnvCwd = path.join(projectRoot, '.vercel');
const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const mode = process.argv[2];
const command = mode === 'api' ? 'dev:api:serve' : mode === 'erp' ? 'dev:erp:serve' : 'dev:stack';
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
  'npm',
  '--prefix',
  '..',
  'run',
  command,
];
const env = { ...process.env };
const testArtifactRunId = env.VITE_TEST_ARTIFACT_RUN_ID;
for (const key of Object.keys(env)) {
  if (/^(?:NFE_|NFCE_|SEFAZ_|SUPABASE_|VITE_|NODE_EXTRA_CA_CERTS$|NODE_TLS_REJECT_UNAUTHORIZED$)/.test(key)) delete env[key];
}
if (testArtifactRunId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testArtifactRunId)) {
    process.stderr.write('Vercel Development recusou um identificador de execução de teste inválido.\n');
    process.exit(1);
  }
  env.VITE_TEST_ARTIFACT_RUN_ID = testArtifactRunId.toLowerCase();
}
env.MORANTE_ENV_SOURCE = 'vercel-development';
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
  process.stderr.write('Could not start Vercel Development.\n');
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code || 0;
});
