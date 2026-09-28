import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const hostUrl = process.env.SONAR_HOST_URL;
const token = process.env.SONAR_TOKEN;

if (!token) {
  console.error('Defina SONAR_TOKEN no ambiente antes de executar a análise.');
  process.exit(1);
}

if (!hostUrl) {
  console.error('Defina SONAR_HOST_URL para a instância SonarQube local.');
  process.exit(1);
}

let target;
try {
  target = new URL(hostUrl);
} catch {
  console.error('SONAR_HOST_URL precisa ser uma URL válida da instância local.');
  process.exit(1);
}

if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '9001') {
  console.error('A análise deste projeto está restrita ao SonarQube local em localhost:9001.');
  process.exit(1);
}

const scanner = path.join(projectRoot, 'node_modules', '@sonar', 'scan', 'bin', 'sonar-scanner.js');
const scannerWorkDir = await mkdtemp(path.join(os.tmpdir(), 'morantehub-sonar-working-'));
// Keep the JRE and scanner cache path short enough for Windows extraction paths.
const sonarUserHome = process.env.SONAR_USER_HOME ?? path.join(os.tmpdir(), 'sonar');
const child = spawn(process.execPath, [scanner, `-Dsonar.working.directory=${scannerWorkDir}`], {
  cwd: projectRoot,
  env: { ...process.env, SONAR_HOST_URL: target.origin, SONAR_USER_HOME: sonarUserHome },
  stdio: 'inherit',
});

child.on('error', async error => {
  console.error(`Não foi possível iniciar o SonarScanner: ${error.message}`);
  await rm(scannerWorkDir, { recursive: true, force: true }).catch(() => {});
  process.exitCode = 1;
});

child.on('exit', async (code, signal) => {
  await rm(scannerWorkDir, { recursive: true, force: true }).catch(() => {});
  process.exitCode = code ?? (signal ? 1 : 0);
});
