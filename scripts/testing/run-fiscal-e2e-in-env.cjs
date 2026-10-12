const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '../..');
const mode = process.argv[2];
const rawArgs = process.argv.slice(3);

function stop(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function required(name, fallback) {
  const value = (process.env[name] || (fallback ? process.env[fallback] : ''))?.trim();
  if (!value) stop(`E2E fiscal bloqueado. Variável de runtime ausente: ${name}.`);
  if (/^<redacted>$/i.test(value) || value.toLowerCase() === 'redacted') {
    stop(`E2E fiscal bloqueado. ${name} recebeu o placeholder de interface <redacted>; leia o secret de runtime novamente.`);
  }
  return value;
}

if (!['simulated', 'hml'].includes(mode)) stop('Modo de teste fiscal inválido.');

function optionValue(name, environmentName) {
  const index = rawArgs.indexOf(name);
  const argumentValue = index < 0 ? '' : (rawArgs[index + 1] || '').trim();
  return argumentValue || (environmentName ? (process.env[environmentName] || '').trim() : '');
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const runId = optionValue('--run-id', 'FISCAL_E2E_RUN_ID');
const orderId = optionValue('--order-id', 'FISCAL_E2E_ORDER_ID');
const scenarioKey = optionValue('--scenario-key', 'FISCAL_E2E_SCENARIO_KEY');
if (!validUuid(runId)) stop('E2E fiscal bloqueado: informe FISCAL_E2E_RUN_ID com o UUID de uma execução já persistida ou use --run-id.');
if (!validUuid(orderId)) stop('E2E fiscal bloqueado: informe FISCAL_E2E_ORDER_ID com o UUID de um pedido já persistido ou use --order-id.');
if (!/^[a-z][a-z0-9_-]{2,63}$/i.test(scenarioKey)) {
  stop('E2E fiscal bloqueado: informe FISCAL_E2E_SCENARIO_KEY ou --scenario-key do cenário persistido.');
}
if (!['nfe55_sale', 'nfe55_delivery_own_transport', 'nfce65_pickup', 'nfce65_delivery'].includes(scenarioKey.toLowerCase())) {
  stop('E2E fiscal bloqueado: informe um cenário implementado: nfe55_sale, nfe55_delivery_own_transport, nfce65_pickup ou nfce65_delivery.');
}
const authorizeTransmission = rawArgs.includes('--authorize-hml-transmission');
if (authorizeTransmission && mode !== 'hml') {
  stop('--authorize-hml-transmission só pode ser usado no modo hml.');
}

const supabaseUrl = required('VITE_SUPABASE_URL', 'SUPABASE_URL');
const anonKey = required('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
const serviceKey = required('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
const operatorEmail = required('NFE_HML_TEST_OPERATOR_EMAIL').toLowerCase();
required('NFE_HML_TEST_OPERATOR_PASSWORD');

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
env.NFE_HML_TEST_OPERATOR_EMAIL = operatorEmail;
env.FISCAL_E2E_RUN_ID = runId.toLowerCase();
env.FISCAL_E2E_SCENARIO_KEY = scenarioKey.trim().toLowerCase();
env.VITE_TEST_ARTIFACT_RUN_ID = runId.toLowerCase();
env.VITE_TEST_ARTIFACT_SCENARIO_KEY = scenarioKey.trim().toLowerCase();
env.FISCAL_E2E_ORDER_ID = orderId.toLowerCase();
if (authorizeTransmission) env.FISCAL_E2E_TRANSMISSION_AUTHORIZED = 'true';
else delete env.FISCAL_E2E_TRANSMISSION_AUTHORIZED;
env.FISCAL_E2E_ALLOWED_SUPABASE_REF = linkedRef;
env.VITE_SUPABASE_URL = supabaseUrl;
env.SUPABASE_URL = supabaseUrl;
env.VITE_SUPABASE_ANON_KEY = anonKey;
env.SUPABASE_SECRET_KEY = serviceKey;
env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
env.VERCEL_ENV = 'development';
env.MORANTE_ENV_SOURCE = 'vercel-development';
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

const consumedOptions = new Set(['--run-id', '--order-id', '--scenario-key', '--authorize-hml-transmission']);
const playwrightArgs = rawArgs.filter((arg, index) => {
  if (consumedOptions.has(arg)) return false;
  if (rawArgs[index - 1] === '--run-id' || rawArgs[index - 1] === '--order-id' || rawArgs[index - 1] === '--scenario-key') return false;
  return true;
});
const npmArgs = [
  'run',
  'test:e2e:fiscal:runner',
  '--prefix',
  'erp',
  ...(playwrightArgs.length ? ['--', ...playwrightArgs] : []),
];
const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(executable, npmArgs, {
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
