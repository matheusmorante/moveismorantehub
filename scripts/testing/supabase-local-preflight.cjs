const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

function fail(message) {
  throw new Error(`[Supabase local preflight] ${message}`);
}

function readTomlValue(text, section, key) {
  const lines = text.split(/\r?\n/);
  let active = '';
  const matches = [];
  for (const line of lines) {
    const header = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
    if (header) {
      active = header[1];
      continue;
    }
    if (active !== section) continue;
    const match = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(?:"([^"]+)"|(\\d+))\\s*(?:#.*)?$`));
    if (match) matches.push(match[1] || match[2]);
  }
  return matches;
}

function parseConfig(projectDir = ROOT) {
  const configPath = path.join(projectDir, 'supabase', 'config.toml');
  const text = fs.readFileSync(configPath, 'utf8');
  const projectIds = text.match(/^\s*project_id\s*=\s*"([^"]+)"/gm) || [];
  const projectId = projectIds.length === 1 ? projectIds[0].match(/"([^"]+)"/)[1] : null;
  const apiPorts = readTomlValue(text, 'api', 'port');
  const dbPorts = readTomlValue(text, 'db', 'port');
  if (!projectId || apiPorts.length !== 1 || dbPorts.length !== 1) fail('config.toml não define project_id/portas únicos e válidos.');
  const apiPort = Number(apiPorts[0]);
  const dbPort = Number(dbPorts[0]);
  if (![apiPort, dbPort].every(port => Number.isInteger(port) && port > 0 && port < 65536)) fail('Portas inválidas em config.toml.');
  return { projectId, apiPort, dbPort };
}

function parseCliEnv(stdout) {
  const env = {};
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^\s*(API_URL|DB_URL|ANON_KEY|SERVICE_ROLE_KEY|JWT_SECRET)=(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function localUrl(value, protocol, expectedPort, label, allowDbName = false) {
  let url;
  try { url = new URL(value); } catch { fail(`${label} ausente ou inválida.`); }
  if (url.hostname !== '127.0.0.1' || url.protocol !== protocol || Number(url.port) !== expectedPort) {
    fail(`${label} não aponta para o serviço local configurado.`);
  }
  if (!allowDbName && (url.username || url.password)) fail(`${label} contém credenciais inesperadas.`);
  return url;
}

function assertInheritedDestinations(config) {
  const apiVariables = ['SUPABASE_URL', 'API_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL', 'REACT_APP_SUPABASE_URL', 'PUBLIC_SUPABASE_URL'];
  for (const name of apiVariables) {
    const value = process.env[name];
    if (!value) continue;
    localUrl(value, 'http:', config.apiPort, name);
  }
  const dbVariables = ['DATABASE_URL', 'DB_URL', 'SUPABASE_DB_URL'];
  for (const name of dbVariables) {
    const value = process.env[name];
    if (!value) continue;
    localUrl(value, 'postgresql:', config.dbPort, name, true);
  }
  if (process.env.PGHOST && process.env.PGHOST !== '127.0.0.1') fail('PGHOST não é o loopback IPv4 exigido.');
  if (process.env.PGPORT && Number(process.env.PGPORT) !== config.dbPort) fail('PGPORT difere da porta local configurada.');
  for (const name of ['PLAYWRIGHT_TEST_BASE_URL', 'PLAYWRIGHT_BASE_URL', 'E2E_BASE_URL', 'BASE_URL']) {
    const value = process.env[name];
    if (!value) continue;
    let url;
    try { url = new URL(value); } catch { fail(`${name} não é uma URL válida.`); }
    if (url.hostname !== '127.0.0.1') fail(`${name} não aponta para 127.0.0.1.`);
  }
}

function assertLocalTestSources() {
  const sources = [
    path.join(ROOT, 'supabase', 'seed.sql'),
    ...[
      'scripts/testing/run-local-supabase-test.cjs',
      'supabase/tests/stock_unavailabilities.sql',
      'supabase/tests/concurrency_stock_unavailabilities.cjs',
      'supabase/tests/storage_unavailabilities.cjs',
      'supabase/tests/test_stock_unavailabilities.cjs',
      'supabase/tests/rls_stock_unavailabilities.cjs',
    ].map(file => path.join(ROOT, file)),
    ...['playwright.config.ts', 'playwright.config.js', 'erp/playwright.config.ts', 'mobile/playwright.config.ts'].map(file => path.join(ROOT, file)).filter(fs.existsSync),
  ].filter(fs.existsSync);
  const allowedHosts = new Set(['127.0.0.1', 'localhost', 'example.test']);
  for (const file of sources) {
    const content = fs.readFileSync(file, 'utf8');
    const urls = content.match(/https?:\/\/[^\s'"`<>),;]+/g) || [];
    for (const candidate of urls) {
      let url;
      try { url = new URL(candidate.replace(/[.]+$/, '')); } catch { fail(`URL literal inválida em ${path.relative(ROOT, file)}.`); }
      if (!allowedHosts.has(url.hostname)) fail(`URL literal remota encontrada em código de teste/seed: ${path.relative(ROOT, file)}.`);
    }
  }
}

function assertLocalDockerTarget() {
  let endpoint = process.env.DOCKER_HOST;
  if (!endpoint) {
    try {
      endpoint = execFileSync('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], {
        cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
      }).trim();
    } catch {
      fail('Context Docker ativo não pôde ser confirmado.');
    }
  }
  const localPipe = /^npipe:\/{4}\.\/pipe\/docker[A-Za-z0-9_-]*$/i.test(endpoint) || /^npipe:\/\/\.\/pipe\/docker[A-Za-z0-9_-]*$/i.test(endpoint);
  const localSocket = /^unix:\/\/(?:\/var\/run\/docker\.sock|\/run\/docker\.sock|\/[^\s]+\.docker\/run\/docker\.sock)$/i.test(endpoint);
  let loopbackTcp = false;
  try {
    const url = new URL(endpoint);
    loopbackTcp = url.protocol === 'tcp:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  } catch { /* unix socket/npipe não é URL HTTP */ }
  if (!localPipe && !localSocket && !loopbackTcp) fail('Context Docker ativo não é um endpoint local conhecido.');
}

function runCli(config, projectDir = ROOT) {
  assertLocalDockerTarget();
  const cli = path.join(ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');
  if (!fs.existsSync(cli)) fail('Supabase CLI local e fixada não encontrada. Instale as dependências do projeto.');
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [cli, 'status', '--workdir', projectDir, '--output', 'env'], {
      cwd: projectDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
  } catch {
    fail('Supabase local não está ativo ou `supabase status` não confirmou o projeto. Nenhuma suíte foi iniciada.');
  }
  const values = parseCliEnv(stdout);
  if (!values.API_URL || !values.DB_URL || !values.ANON_KEY || !values.SERVICE_ROLE_KEY) fail('CLI não retornou os endpoints e as chaves locais esperadas.');
  const api = localUrl(values.API_URL, 'http:', config.apiPort, 'API_URL');
  const db = localUrl(values.DB_URL, 'postgresql:', config.dbPort, 'DB_URL', true);

  // The CLI command is scoped to this directory; this extra check ties the active DB container to config.toml.
  try {
    const containerName = `supabase_db_${config.projectId}`;
    execFileSync('docker', ['inspect', containerName], { stdio: 'ignore', windowsHide: true });
  } catch {
    fail('Container PostgreSQL do project_id configurado não foi confirmado.');
  }
  return { apiUrl: api.origin, dbUrl: db.href, anonKey: values.ANON_KEY, serviceRoleKey: values.SERVICE_ROLE_KEY, projectId: config.projectId, apiPort: config.apiPort, dbPort: config.dbPort };
}

function assertLocalKeys(active) {
  for (const name of ['ANON_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    const value = process.env[name];
    if (!value) continue;
    const expected = name.includes('SERVICE_ROLE') ? active.serviceRoleKey : active.anonKey;
    if (value !== expected) fail(`${name} não corresponde à chave do stack local confirmado.`);
  }
}

async function verifyLocalSupabase({ projectDir = ROOT, checkInherited = true } = {}) {
  const config = parseConfig(projectDir);
  if (checkInherited) assertInheritedDestinations(config);
  assertLocalTestSources();
  const active = runCli(config, projectDir);
  if (checkInherited) assertLocalKeys(active);
  try {
    const [authHealth, apiHealth] = await Promise.all([
      fetch(`${active.apiUrl}/auth/v1/health`),
      fetch(`${active.apiUrl}/rest/v1/`, { headers: { apikey: active.anonKey, Authorization: `Bearer ${active.anonKey}` } }),
    ]);
    if (!authHealth.ok || !apiHealth.ok) fail('Auth/API local não responderam com saúde HTTP válida.');
  } catch (error) {
    if (error.message.startsWith('[Supabase local preflight]')) throw error;
    fail('Auth/API local não estão acessíveis no endereço confirmado.');
  }
  let Client;
  try { ({ Client } = require(require.resolve('pg', { paths: [path.join(ROOT, 'supabase/tests')] }))); }
  catch { fail('Driver PostgreSQL do workspace de testes não encontrado.'); }
  const db = new Client({ connectionString: active.dbUrl, connectionTimeoutMillis: 5000 });
  try {
    await db.connect();
    await db.query('SELECT 1');
  } catch {
    fail('PostgreSQL não aceitou conexão no endereço local confirmado.');
  } finally {
    try { await db.end(); } catch { /* conexão não chegou a abrir */ }
  }
  // Returned secrets are for the calling process only and are never printed by this module.
  return active;
}

if (require.main === module) {
  verifyLocalSupabase().then(active => {
    console.log(`Supabase local confirmado: project_id=${active.projectId}, API=127.0.0.1:${active.apiPort}, PostgreSQL=127.0.0.1:${active.dbPort}.`);
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { verifyLocalSupabase, parseConfig, localUrl, assertInheritedDestinations, assertLocalDockerTarget, assertLocalTestSources };
