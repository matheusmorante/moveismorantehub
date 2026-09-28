const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cmd = process.argv[2];

function findExe(name, wingetDir) {
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

if (cmd === 'secrets') {
  const gitleaks = findExe('gitleaks', 'Gitleaks.Gitleaks');
  console.log(`[Security] Executing Gitleaks with: ${gitleaks}`);
  const res = spawnSync(gitleaks, ['dir', '--no-banner', '-c', '.gitleaks.toml', '.'], {
    stdio: 'inherit',
    shell: true,
  });
  process.exit(res.status || 0);
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
  process.exit(res.status || 0);
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
  process.exit(res.status || 0);
} else {
  console.error(`Unknown security command: ${cmd}. Available: secrets, vuln, sbom`);
  process.exit(1);
}
