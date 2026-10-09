const { spawn } = require('node:child_process');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../..');
const mode = process.argv[2];
const expectedOperator = 'matheusmorante0012@gmail.com';
const operationalRefs = new Set(['hkoxhourxwlddgsfdgws', 'wzpdfmihnwcrgkyagwkd']);

function stop(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) stop(`E2E fiscal bloqueado. Secret de runtime ausente: ${name}.`);
  return value;
}

if (!['simulated', 'hml'].includes(mode)) stop('Modo de teste fiscal inválido.');

const testSupabaseUrl = required('FISCAL_E2E_SUPABASE_URL');
const testSupabaseAnonKey = required('FISCAL_E2E_SUPABASE_ANON_KEY');
const testSupabaseServiceKey = required('FISCAL_E2E_SUPABASE_SERVICE_ROLE_KEY');
const allowedRef = required('FISCAL_E2E_ALLOWED_SUPABASE_REF');
const operatorEmail = required('NFE_HML_TEST_OPERATOR_EMAIL').toLowerCase();
required('NFE_HML_TEST_OPERATOR_PASSWORD');
if (operatorEmail !== expectedOperator) stop('E2E fiscal bloqueado: a identidade do operador autorizado não corresponde.');

let configuredRef;
try {
  const url = new URL(testSupabaseUrl);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) throw new Error();
  configuredRef = url.hostname.split('.')[0];
} catch {
  stop('E2E fiscal bloqueado: a URL do Supabase isolado é inválida.');
}
if (configuredRef !== allowedRef || operationalRefs.has(configuredRef)) {
  stop('E2E fiscal bloqueado: a URL não corresponde a uma ref Supabase isolada aprovada.');
}

const env = { ...process.env };
env.FISCAL_E2E_MODE = mode;
env.FISCAL_E2E_ALLOWED_SUPABASE_REF = allowedRef;
env.VITE_SUPABASE_URL = testSupabaseUrl;
env.SUPABASE_URL = testSupabaseUrl;
env.VITE_SUPABASE_ANON_KEY = testSupabaseAnonKey;
env.SUPABASE_SECRET_KEY = testSupabaseServiceKey;
env.SUPABASE_SERVICE_ROLE_KEY = testSupabaseServiceKey;
env.VERCEL_ENV = 'development';
env.MORANTE_ENV_SOURCE = 'vercel-development';
env.NFE_ENVIRONMENT = '2';
env.NFE_PRODUCTION_ENABLED = 'false';
env.E2E_ISOLATED_DATA = '1';
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
