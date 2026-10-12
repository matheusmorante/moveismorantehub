const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const auditRunner = path.join(__dirname, 'run-fiscal-audit.cjs');
const audits = [
  ['policy-status', 'guards de artefatos remotos'],
  ['operator', 'autenticação e permissão do operador HML'],
  ['tls', 'WSDL dos modelos 55 e 65'],
  ['services', 'status e consultas read-only da SEFA/PR'],
];

function main() {
  for (const [mode, label] of audits) {
    process.stdout.write(`\nVerificando ${label}...\n`);
    const result = spawnSync(process.execPath, [auditRunner, mode], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'inherit',
    });

    if (result.error) {
      process.stderr.write(`Falha ao iniciar auditoria de ${label}.\n`);
      process.exitCode = 1;
      return;
    }
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      return;
    }
  }

  process.stdout.write(
    '\nPreflight de infraestrutura HML aprovado. Isso não confirma artefato E2E persistido nem autorização de NF-e/NFC-e. Nenhum documento foi transmitido.\n'
  );
}

if (require.main === module) main();

module.exports = { main };
