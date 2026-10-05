const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cmd = process.argv[2];
const securityExitCode = (result) => typeof result.status === 'number' ? result.status : 1;

function findExe(name, wingetDir) {
  const configured = name === 'gitleaks' ? process.env.MORANTE_GITLEAKS_PATH : undefined;
  if (configured && fs.existsSync(configured) && fs.statSync(configured).isFile()) return configured;
  // Check PATH first
  const which = process.platform === 'win32' ? 'where' : 'which';
  const probe = spawnSync(which, [name], { encoding: 'utf8', shell: true });
  if (probe.status === 0 && probe.stdout.trim()) {
    return probe.stdout.trim().split(/\r?\n/)[0];
  }

  // Check WinGet LocalAppData package path on Windows
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const pkgBase = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(pkgBase)) {
      const dirs = fs.readdirSync(pkgBase).filter((d) => d.startsWith(wingetDir));
      if (dirs.length > 0) {
        const candidate = path.join(pkgBase, dirs[0], `${name}.exe`);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }

  return name;
}

if (require.main === module) {
if (cmd === 'secrets' || cmd === 'history') {
  const gitleaks = findExe('gitleaks', 'Gitleaks.Gitleaks');
  console.log(`[Security] Executing Gitleaks with: ${gitleaks}`);
  const args = cmd === 'history'
    ? ['git','--redact','--no-banner','-c',process.env.MORANTE_GITLEAKS_CONFIG || '.gitleaks.history.toml','--log-opts=--all','.']
    : ['dir','--redact','--no-banner','-c','.gitleaks.toml','.'];
  const res = spawnSync(gitleaks, args, {
    stdio: 'inherit',
    windowsHide:true,
  });
  process.exit(securityExitCode(res));
} else if (cmd === 'vuln') {
  const trivy = findExe('trivy', 'AquaSecurity.Trivy');
  console.log(`[Security] Executing Trivy with: ${trivy}`);
  // Set empty DOCKER_CONFIG if docker-credential-desktop is missing
  const env = { ...process.env };
  if (!env.DOCKER_CONFIG) {
    const tempDir = path.join(process.env.TEMP || '/tmp', 'empty_docker');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    env.DOCKER_CONFIG = tempDir;
  }
  const res = spawnSync(
    trivy,
    ['fs', '--scanners', 'vuln,misconfig', '--severity', 'HIGH,CRITICAL', '.'],
    { stdio: 'inherit', shell: true, env }
  );
  process.exit(securityExitCode(res));
} else if (cmd === 'sbom') {
  const trivy = findExe('trivy', 'AquaSecurity.Trivy');
  console.log(`[Security] Generating CycloneDX SBOM with: ${trivy}`);
  const env = { ...process.env };
  if (!env.DOCKER_CONFIG) {
    const tempDir = path.join(process.env.TEMP || '/tmp', 'empty_docker');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    env.DOCKER_CONFIG = tempDir;
  }
  const res = spawnSync(
    trivy,
    ['fs', '--format', 'cyclonedx', '--output', 'sbom.json', '.'],
    { stdio: 'inherit', shell: true, env }
  );
  process.exit(securityExitCode(res));
} else {
  console.error(`Unknown security command: ${cmd}. Available: secrets, history, vuln, sbom`);
  process.exit(1);
}
}
module.exports = {findExe,securityExitCode};
