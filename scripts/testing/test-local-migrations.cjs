const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { parseConfig, assertInheritedDestinations, assertLocalDockerTarget, verifyLocalSupabase } = require('./supabase-local-preflight.cjs');

const ROOT = path.resolve(__dirname, '../..');
const CLI = path.join(ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');
const SUPABASE_SOURCE = path.join(ROOT, 'supabase');
const MANIFEST_PATH = path.join(ROOT, 'supabase/tests/certification/schema.expected.json');
const BASELINE_DIR = path.join(ROOT, 'supabase/tests/certification/baseline');
const MIGRATION_NAME = /^([0-9]{14})_.*\.sql$/;

function refuse(message) {
  throw new Error(message);
}

function pathInsideRoot(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath || path.isAbsolute(relativePath)) refuse('Caminho de artefato inválido no manifesto.');
  const resolved = path.resolve(ROOT, relativePath);
  if (!resolved.startsWith(`${ROOT}${path.sep}`)) refuse('Manifesto tentou sair do repositório.');
  return resolved;
}

function requiredFile(relativePath) {
  const absolute = pathInsideRoot(relativePath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) refuse(`Artefato obrigatório não encontrado: ${relativePath}`);
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', '--', relativePath], { cwd: ROOT, stdio: 'ignore', windowsHide: true });
  if (tracked.status !== 0) refuse(`Artefato não está versionado: ${relativePath}`);
  return absolute;
}

function verifyBaseline(manifest) {
  if (manifest.status !== 'complete' || !manifest.profile || !Array.isArray(manifest.objects) || manifest.objects.length === 0 || !manifest.schemaSnapshot || !manifest.baseline) {
    refuse('test:migrations bloqueado: baseline completa, provenance e schema esperado ainda não foram aprovados. Nenhum Docker/Supabase foi iniciado.');
  }
  const snapshotSections = ['relations', 'columns', 'constraints', 'indexes', 'functions', 'triggers', 'policies', 'tableGrants', 'routineGrants', 'sequenceGrants', 'userTypes', 'storageBuckets'];
  if (snapshotSections.some(section => !Array.isArray(manifest.schemaSnapshot[section])) || manifest.schemaSnapshot.relations.length === 0 || manifest.schemaSnapshot.columns.length === 0) {
    refuse('Snapshot esperado não contém todas as famílias de objetos ou está vazio. Nenhum Docker/Supabase foi iniciado.');
  }
  const provenancePath = requiredFile(manifest.baseline.provenanceFile);
  if (!provenancePath.startsWith(`${BASELINE_DIR}${path.sep}`)) refuse('Provenance da baseline deve ficar no diretório certificado.');
  const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
  const source = provenance.source || {};
  const cutoff = provenance.migrationThrough;
  if (!['repository-migration-chain', 'schema-only-environment'].includes(source.kind)
      || !source.identity || !/^[0-9a-f]{40}$/i.test(source.gitCommit || '')
      || !/^\d{14}$/.test(cutoff || '') || !provenance.capturedAt || !provenance.pgMajorVersion
      || !provenance.supabaseCliVersion || !provenance.pgDumpVersion) {
    refuse('Provenance da baseline não contém origem, commit, checkpoint e versões obrigatórios.');
  }
  const commit = spawnSync('git', ['cat-file', '-e', `${source.gitCommit}^{commit}`], { cwd: ROOT, stdio: 'ignore', windowsHide: true });
  if (commit.status !== 0) refuse('Commit Git declarado pela baseline não existe neste clone.');

  const artifacts = provenance.artifacts || {};
  const files = ['schema.sql', 'legacy-data.sql', 'pre-upgrade-assertions.sql', 'post-upgrade-assertions.sql'];
  for (const name of files) {
    const relativePath = artifacts[name]?.path;
    const absolute = requiredFile(relativePath);
    if (!absolute.startsWith(`${BASELINE_DIR}${path.sep}`)) refuse(`Artefato ${name} deve ficar no diretório versionado da baseline.`);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
    if (digest !== artifacts[name].sha256) refuse(`SHA-256 divergente no artefato ${name}.`);
  }
  const dataSql = fs.readFileSync(pathInsideRoot(artifacts['legacy-data.sql'].path), 'utf8');
  if (!/TEST_AUT_[A-Za-z0-9_-]+/.test(dataSql)) refuse('Dados legados precisam ser fixtures sintéticas identificadas por TEST_AUT_.');

  const migrations = fs.readdirSync(path.join(SUPABASE_SOURCE, 'migrations')).filter(name => MIGRATION_NAME.test(name)).sort();
  if (!migrations.some(name => name.startsWith(`${cutoff}_`))) refuse('Checkpoint da baseline não coincide com uma migration versionada do repositório.');
  const later = migrations.filter(name => name.match(MIGRATION_NAME)[1] > cutoff);
  if (later.length === 0) refuse('Baseline não possui migrations posteriores para validar o upgrade.');
  return { provenance, artifacts, cutoff, migrations, later };
}

function cleanCliEnvironment() {
  const env = { ...process.env };
  for (const name of [
    'SUPABASE_URL', 'API_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL', 'REACT_APP_SUPABASE_URL', 'PUBLIC_SUPABASE_URL',
    'DATABASE_URL', 'DB_URL', 'SUPABASE_DB_URL', 'ANON_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY',
    'SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'PGHOST', 'PGPORT',
    'OPENAI_API_KEY',
  ]) delete env[name];
  return env;
}

function runCli(args, label, cwd, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args, '--workdir', cwd], {
    cwd, env: cleanCliEnvironment(), encoding: 'utf8', windowsHide: true,
    timeout: 20 * 60 * 1000, maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    if (allowFailure) return { ok: false, status: result.status ?? -1 };
    refuse(`${label} falhou (código ${result.status ?? -1}); a saída bruta foi omitida para proteger credenciais.`);
  }
  return { ok: true, stdout: result.stdout || '' };
}

async function freePort(used) {
  for (;;) {
    const server = net.createServer();
    await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    await new Promise(resolve => server.close(resolve));
    if (!used.has(port)) { used.add(port); return port; }
  }
}

function setTomlValue(text, section, key, value) {
  const lines = text.split(/\r?\n/);
  let active = '';
  let replaced = false;
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
    if (heading) { active = heading[1]; continue; }
    if (active === section && new RegExp(`^\\s*${key}\\s*=`).test(lines[i])) {
      lines[i] = lines[i].replace(new RegExp(`^(\\s*)${key}\\s*=.*$`), `$1${key} = ${value}`);
      replaced = true;
      break;
    }
  }
  if (!replaced) refuse(`config.toml não contém [${section}].${key} que precisa ser isolado.`);
  return lines.join('\n');
}

async function prepareProject(projectId, migrations) {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'morantehub-supabase-cert-'));
  const supabaseDir = path.join(projectDir, 'supabase');
  fs.mkdirSync(path.join(supabaseDir, 'migrations'), { recursive: true });
  let config = fs.readFileSync(path.join(SUPABASE_SOURCE, 'config.toml'), 'utf8');
  config = config.replace(/^project_id\s*=\s*"[^"]+"/m, `project_id = "${projectId}"`);
  const used = new Set();
  for (const [section, key] of [
    ['api', 'port'], ['db', 'port'], ['db', 'shadow_port'], ['db.pooler', 'port'], ['studio', 'port'],
    ['local_smtp', 'port'], ['analytics', 'port'], ['edge_runtime', 'inspector_port'],
  ]) config = setTomlValue(config, section, key, await freePort(used));
  const apiPort = config.match(/^\[api\][\s\S]*?^port\s*=\s*(\d+)/m)?.[1];
  config = config.replace(/(^\[studio\][\s\S]*?^api_url\s*=\s*")[^"]*(")/m, `$1http://127.0.0.1:${apiPort}$2`);
  fs.writeFileSync(path.join(supabaseDir, 'config.toml'), config);
  if (fs.existsSync(path.join(SUPABASE_SOURCE, 'seed.sql'))) fs.copyFileSync(path.join(SUPABASE_SOURCE, 'seed.sql'), path.join(supabaseDir, 'seed.sql'));
  for (const migration of migrations) fs.copyFileSync(path.join(SUPABASE_SOURCE, 'migrations', migration), path.join(supabaseDir, 'migrations', migration));
  return projectDir;
}

function pgClient(local) {
  const { Client } = require(require.resolve('pg', { paths: [path.join(ROOT, 'supabase/tests')] }));
  return new Client({ connectionString: local.dbUrl });
}

async function runSqlFile(local, relativePath) {
  const client = pgClient(local);
  try {
    await client.connect();
    await client.query(fs.readFileSync(pathInsideRoot(relativePath), 'utf8'));
  } finally { await client.end(); }
}

function driftEnv(local, projectDir) {
  const env = cleanCliEnvironment();
  Object.assign(env, {
    SUPABASE_TEST_PROJECT_DIR: projectDir,
    API_URL: local.apiUrl, SUPABASE_URL: local.apiUrl, VITE_SUPABASE_URL: local.apiUrl,
    NEXT_PUBLIC_SUPABASE_URL: local.apiUrl, EXPO_PUBLIC_SUPABASE_URL: local.apiUrl,
    REACT_APP_SUPABASE_URL: local.apiUrl, PUBLIC_SUPABASE_URL: local.apiUrl,
    DATABASE_URL: local.dbUrl, DB_URL: local.dbUrl, SUPABASE_DB_URL: local.dbUrl,
    ANON_KEY: local.anonKey, SUPABASE_ANON_KEY: local.anonKey,
    SERVICE_ROLE_KEY: local.serviceRoleKey, SUPABASE_SERVICE_ROLE_KEY: local.serviceRoleKey,
  });
  return env;
}

function runDrift(local, projectDir, label) {
  const script = path.join(ROOT, 'scripts/testing/check-schema-drift.cjs');
  const result = spawnSync(process.execPath, [script], {
    cwd: ROOT, env: driftEnv(local, projectDir), encoding: 'utf8', windowsHide: true,
    timeout: 5 * 60 * 1000, maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) refuse(`${label}: schema drift não confere com o manifesto versionado.`);
}

function stageProjectId(stage) {
  return `morantehub-cert-${stage}-${crypto.randomBytes(4).toString('hex')}`;
}

async function runIsolatedStage(stage, migrations, { upgrade } = {}) {
  const projectId = stageProjectId(stage);
  const projectDir = await prepareProject(projectId, migrations);
  let startAttempted = false;
  const result = { stage, projectId, passed: false, steps: [] };
  let stageError;
  let cleanupFailed = false;
  try {
    startAttempted = true;
    runCli(['start', '--yes'], `${stage}: start limpo`, projectDir);
    result.steps.push('start limpo');
    const local = await verifyLocalSupabase({ projectDir, checkInherited: false });

    if (upgrade) {
      runCli(['db', 'reset', '--local', '--version', upgrade.cutoff, '--yes'], `${stage}: restaurar baseline até ${upgrade.cutoff}`, projectDir);
      result.steps.push(`baseline isolada até ${upgrade.cutoff}`);
      await runSqlFile(local, upgrade.artifacts['pre-upgrade-assertions.sql'].path);
      result.steps.push('assertions pré-upgrade');
      runCli(['db', 'reset', '--local', '--yes'], `${stage}: aplicar upgrade completo`, projectDir);
      await runSqlFile(local, upgrade.artifacts['post-upgrade-assertions.sql'].path);
      result.steps.push('upgrade e assertions de legado');
    } else runCli(['db', 'reset', '--local', '--yes'], `${stage}: db reset`, projectDir);
    if (!upgrade) result.steps.push('db reset local; migrations e seeds');
    runDrift(local, projectDir, stage);
    result.steps.push('schema drift');
    if (!upgrade) {
      runCli(['stop', '--project-id', projectId, '--yes'], `${stage}: stop para persistência`, projectDir);
      result.steps.push('stop preservando volume');
      runCli(['start', '--yes'], `${stage}: restart`, projectDir);
      const restarted = await verifyLocalSupabase({ projectDir, checkInherited: false });
      runDrift(restarted, projectDir, `${stage} após restart`);
      result.steps.push('start novamente e schema persistido');
    }
    result.passed = true;
  } catch (error) {
    stageError = error;
  } finally {
    if (startAttempted) {
      const stopped = runCli(['stop', '--project-id', projectId, '--no-backup', '--yes'], `${stage}: stop/cleanup`, projectDir, { allowFailure: true });
      if (!stopped.ok) cleanupFailed = true;
      else result.steps.push('stop e remoção do volume exclusivo');
    }
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
  if (stageError || cleanupFailed) {
    const details = [stageError?.message, cleanupFailed ? 'cleanup do container/volume exclusivo não foi confirmado' : null].filter(Boolean).join('; ');
    throw new Error(`${stage}: ${details}`);
  }
  return result;
}

async function main() {
  if (!fs.existsSync(CLI)) refuse('Supabase CLI local fixada não encontrada. Instale as dependências.');
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  let baseline;
  try { baseline = verifyBaseline(manifest); }
  catch (error) {
    console.error(`${error.message}\nNenhum Docker/Supabase foi iniciado.`);
    process.exitCode = 2;
    return;
  }

  // Reject inherited remote targets before starting any test stack; all stage clients then receive fresh local credentials.
  assertInheritedDestinations(parseConfig(ROOT));
  assertLocalDockerTarget();
  const cleanNames = fs.readdirSync(path.join(SUPABASE_SOURCE, 'migrations')).filter(name => MIGRATION_NAME.test(name)).sort();
  const baselineSql = [
    fs.readFileSync(pathInsideRoot(baseline.artifacts['schema.sql'].path), 'utf8'),
    fs.readFileSync(pathInsideRoot(baseline.artifacts['legacy-data.sql'].path), 'utf8'),
  ].join('\n\n');
  const baselineMigration = `${baseline.cutoff}_approved_certification_baseline.sql`;
  const upgradeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'morantehub-supabase-upgrade-migrations-'));
  const upgradeMigrations = path.join(upgradeDir, 'migrations');
  fs.mkdirSync(upgradeMigrations);
  fs.writeFileSync(path.join(upgradeMigrations, baselineMigration), baselineSql);
  for (const migration of baseline.later) fs.copyFileSync(path.join(SUPABASE_SOURCE, 'migrations', migration), path.join(upgradeMigrations, migration));

  const outcomes = [];
  try {
    for (const run of [
      () => runIsolatedStage('clean', cleanNames),
      () => runIsolatedStage('upgrade', [baselineMigration, ...baseline.later], { upgrade: baseline }),
    ]) {
      try {
        const result = await run();
        outcomes.push(result);
      } catch (error) {
        outcomes.push({ stage: error.message.split(':')[0], passed: false, error: error.message });
      }
    }
  } finally {
    fs.rmSync(upgradeDir, { recursive: true, force: true });
  }
  for (const outcome of outcomes) {
    if (outcome.passed) console.log(`${outcome.stage} passou: ${outcome.steps.join('; ')}.`);
    else console.error(`${outcome.stage || 'stage'} reprovado/pendente: ${outcome.error || 'cleanup incompleto'}`);
  }
  if (outcomes.length !== 2 || outcomes.some(item => !item.passed || item.cleanupFailed)) process.exitCode = 1;
}

main().catch(error => {
  console.error(`test:migrations interrompido com segurança: ${error.message}`);
  process.exitCode = 1;
});
