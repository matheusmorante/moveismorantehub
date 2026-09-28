const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const stages = ['test:local:preflight', 'test:migrations', 'test:schema-drift', 'test:db', 'test:rls', 'test:concurrency', 'test:storage'];

for (const stage of stages) {
  console.log(`\n> ${stage}`);
  const result = spawnSync(npm, ['run', stage], { cwd: ROOT, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) {
    console.error(`test:local-all interrompido em ${stage}; as etapas seguintes não foram executadas.`);
    process.exit(result.status && result.status > 0 ? result.status : 1);
  }
}
