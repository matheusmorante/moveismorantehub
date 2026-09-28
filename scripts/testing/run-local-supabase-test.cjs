const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { verifyLocalSupabase } = require('./supabase-local-preflight.cjs');

const ROOT = path.resolve(__dirname, '../..');
const targets = {
  db: ['node_modules/supabase/dist/supabase.js', ['test', 'db', 'supabase/tests/stock_unavailabilities.sql', '--workdir', ROOT]],
  concurrency: ['supabase/tests/concurrency_stock_unavailabilities.cjs', []],
  storage: ['supabase/tests/storage_unavailabilities.cjs', []],
  rls: ['supabase/tests/rls_stock_unavailabilities.cjs', []],
  'profile-roles': ['supabase/tests/profile_role_assignments.cjs', []],
};

async function run() {
  const target = targets[process.argv[2]];
  if (!target) throw new Error('Uso: run-local-supabase-test.cjs <db|concurrency|storage|rls|profile-roles>');
  const local = await verifyLocalSupabase();
  const [script, args] = target;
  const executable = process.execPath;
  const commandArgs = [path.join(ROOT, script), ...args];
  const result = spawnSync(executable, commandArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      API_URL: local.apiUrl,
      SUPABASE_URL: local.apiUrl,
      DATABASE_URL: local.dbUrl,
      DB_URL: local.dbUrl,
      ANON_KEY: local.anonKey,
      SERVICE_ROLE_KEY: local.serviceRoleKey,
      SUPABASE_PROJECT_ID: local.projectId,
    },
    windowsHide: true,
  });
  if (result.error) throw new Error(`Não foi possível iniciar a suíte ${process.argv[2]}.`);
  process.exitCode = result.status ?? 1;
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
