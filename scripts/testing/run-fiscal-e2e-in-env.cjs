const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../..');
const mode = process.argv[2];
const expectedOperator = 'matheusmorante002@gmail.com';

function stop(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function required(name, fallback) {
  const value = (process.env[name] || (fallback ? process.env[fallback] : ''))?.trim();
  if (!value) stop(`E2E fiscal bloqueado. Variável de runtime ausente: ${name}.`);
  return value;
}

if (!['simulated', 'hml'].includes(mode)) stop('Modo de teste fiscal inválido.');

const supabaseUrl = required('VITE_SUPABASE_URL', 'SUPABASE_URL');
const anonKey = required('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
const serviceKey = required('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
const operatorEmail = required('NFE_HML_TEST_OPERATOR_EMAIL').toLowerCase();
required('NFE_HML_TEST_OPERATOR_PASSWORD');
if (operatorEmail !== expectedOperator) stop('E2E fiscal bloqueado: a identidade do operador autorizado não corresponde.');

let linkedRef;
try {
  linkedRef = fs.readFileSync(path.join(projectRoot, 'supabase/.temp/project-ref'), 'utf8').trim();
} catch {
  stop('E2E fiscal bloqueado: a ref do Supabase vinculado ao repositório não está disponível.');
}

let configuredRef;
try {
  const url = new URL(supabaseUrl);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) throw new Error();
  configuredRef = url.hostname.split('.')[0];
} catch {
  stop('E2E fiscal bloqueado: a URL do Supabase configurado é inválida.');
}
if (!/^[a-z0-9]{20}$/.test(linkedRef) || configuredRef !== linkedRef) {
  stop('E2E fiscal bloqueado: Vercel Development não aponta para o projeto Supabase vinculado ao repositório.');
}

const env = { ...process.env };
env.FISCAL_E2E_MODE = mode;
env.VITE_TEST_ARTIFACT_RUN_ID = randomUUID();
env.FISCAL_E2E_ALLOWED_SUPABASE_REF = linkedRef;
env.VITE_SUPABASE_URL = supabaseUrl;
env.SUPABASE_URL = supabaseUrl;
env.VITE_SUPABASE_ANON_KEY = anonKey;
env.SUPABASE_SECRET_KEY = serviceKey;
env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
env.VERCEL_ENV = 'development';
env.MORANTE_ENV_SOURCE = 'vercel-development';
env.NFE_ENVIRONMENT = '2';
env.NFE_PRODUCTION_ENABLED = 'false';
env.PLAYWRIGHT_TEST_BASE_URL = 'http://127.0.0.1:5173';

if (mode === 'simulated') {
  env.NFE_CERTIFICATE_BASE64 = required('FISCAL_E2E_CERTIFICATE_BASE64');
  env.NFE_CERTIFICATE_PASSWORD = required('FISCAL_E2E_CERTIFICATE_PASSWORD');
  env.NFE_E2E_SEFAZ_MODE = 'simulated';
  env.FISCAL_E2E_SIMULATOR_ENABLED = '1';
} else {
  required('NFE_CERTIFICATE_BASE64');
  required('NFE_CERTIFICATE_PASSWORD');
  delete env.NFE_E2E_SEFAZ_MODE;
  delete env.FISCAL_E2E_SIMULATOR_ENABLED;
}

const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(executable, ['run', 'test:e2e:fiscal:runner', '--prefix', 'erp'], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  windowsHide: true,
});

child.on('error', () => {
  process.stderr.write('Não foi possível iniciar o Playwright fiscal.\n');
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code || 0;
});
