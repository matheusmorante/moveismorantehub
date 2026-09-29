import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sdkRoot = process.env.ANDROID_SDK_ROOT
  || process.env.ANDROID_HOME
  || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
const adbPath = process.env.ADB_PATH || path.join(sdkRoot, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const maestroPath = process.env.MAESTRO_CLI
  || path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Maestro', 'maestro', 'bin', process.platform === 'win32' ? 'maestro.bat' : 'maestro');
const appId = 'com.morante.mobile';
const resultsDir = path.join(os.tmpdir(), 'morante-maestro-results');

function fail(message, code = 1) {
  console.error(`\n[maestro-runner] ${message}`);
  process.exit(code);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.error) fail(`Não foi possível iniciar ${command}: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: process.env,
    shell: process.platform === 'win32',
    timeout: 20_000,
    ...options,
  });
  if (result.error || result.status !== 0) {
    fail(result.error?.message || result.stderr?.trim() || `${command} retornou código ${result.status}.`);
  }
  return result.stdout.trim();
}

function requireDevice() {
  if (!existsSync(adbPath)) {
    fail(`adb não encontrado em ${adbPath}. Configure ANDROID_HOME/ANDROID_SDK_ROOT ou ADB_PATH.`);
  }

  const listing = capture(adbPath, ['devices', '-l']);
  const rows = listing
    .split(/\r?\n/)
    .slice(1)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [serial, state, ...details] = line.split(/\s+/);
      return { serial, state, details: details.join(' ') };
    });

  const requestedSerial = process.env.ANDROID_SERIAL;
  const wifiRows = rows.filter(row =>
    /^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(row.serial) || row.serial.includes('._adb-tls-connect._tcp')
  );
  const targets = requestedSerial
    ? wifiRows.filter(row => row.serial === requestedSerial)
    : wifiRows;

  if (targets.length === 0) {
    fail(
      requestedSerial
        ? `O alvo ${requestedSerial} não foi encontrado como dispositivo ADB por Wi‑Fi. Pareie e conecte o celular em Depuração sem fio; emuladores e USB não são aceitos.`
        : 'NENHUM_CELULAR_WIFI: pareie e conecte o celular por Depuração sem fio antes de executar. Emuladores/AVDs e USB não são aceitos.'
    );
  }

  const unauthorized = targets.find(row => row.state === 'unauthorized');
  if (unauthorized) {
    fail(`O celular ${unauthorized.serial} está unauthorized. Desbloqueie-o e aceite a depuração sem fio.`);
  }

  const offline = targets.find(row => row.state === 'offline');
  if (offline) fail(`O celular ${offline.serial} está offline no ADB. Reconecte a Depuração sem fio.`);

  const devices = targets.filter(row => row.state === 'device');

  if (devices.length === 0) {
    fail('NENHUM_CELULAR_WIFI_AUTORIZADO: `adb devices -l` não listou celular físico autorizado por Wi‑Fi.');
  }

  if (devices.length > 1 && !requestedSerial) {
    fail(`Há ${devices.length} celulares conectados por Wi‑Fi. Defina ANDROID_SERIAL com o serial IP:porta do celular desejado.`);
  }

  const device = devices[0];
  if (/^emulator-/i.test(device.serial)) {
    fail('Alvo recusado: emuladores/AVDs não são permitidos; conecte um celular físico por Wi‑Fi.');
  }

  const qemu = capture(adbPath, ['-s', device.serial, 'shell', 'getprop', 'ro.kernel.qemu']);
  if (qemu === '1') fail('Alvo recusado: o Android informou ro.kernel.qemu=1; use um celular físico por Wi‑Fi.');

  console.log(`[maestro-runner] Celular físico Wi‑Fi selecionado: ${device.serial} (${device.details || 'detalhes ausentes'})`);
  return device.serial;
}

function requireInstalledApp(serial) {
  const result = spawnSync(adbPath, ['-s', serial, 'shell', 'pm', 'path', appId], {
    encoding: 'utf8',
    timeout: 20_000,
  });
  if (result.status !== 0 || !result.stdout?.includes('package:')) {
    fail(`App ${appId} não está instalado no dispositivo ${serial}. Execute "npm run test:mobile:build" primeiro.`);
  }
}

function runMaestro(serial, flowPath, label) {
  if (!existsSync(maestroPath)) {
    fail(`Maestro CLI não encontrado em ${maestroPath}.`);
  }
  if (!existsSync(flowPath)) fail(`Flow não encontrado: ${flowPath}`);

  mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(resultsDir, `${label}-${timestamp}.xml`);
  console.log(`[maestro-runner] Relatório JUnit: ${reportPath}`);

  const relativeFlow = path.relative(projectRoot, flowPath);
  const relativeOutput = path.relative(projectRoot, reportPath);

  const result = spawnSync(maestroPath, [
    `--device=${serial}`,
    'test',
    '--format=JUNIT',
    `--output=${relativeOutput}`,
    relativeFlow,
  ], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  if (result.error) fail(`Falha ao executar Maestro: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const action = process.argv[2] || 'check';
const targetFlow = process.argv[3];

if (action === 'check') {
  requireDevice();
} else if (action === 'build') {
  const serial = requireDevice();
  run(adbPath, ['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081']);
  const expoCli = path.join(projectRoot, 'node_modules', 'expo', 'bin', 'cli');
  run(process.execPath, [expoCli, 'run:android', '--device', serial, '--no-bundler']);
} else if (action === 'start') {
  const serial = requireDevice();
  run(adbPath, ['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081']);
  const expoCli = path.join(projectRoot, 'node_modules', 'expo', 'bin', 'cli');
  run(process.execPath, [expoCli, 'start', '--dev-client', '--localhost', '--port', '8081']);
} else if (action === 'smoke') {
  const serial = requireDevice();
  requireInstalledApp(serial);
  const flow = path.join(projectRoot, 'maestro', 'flows', 'smoke', 'app-launch.yaml');
  runMaestro(serial, flow, 'smoke');
} else if (action === 'inventory') {
  const serial = requireDevice();
  requireInstalledApp(serial);
  const flow = path.join(projectRoot, 'maestro', 'flows', 'inventory', 'inventory-audit.yaml');
  runMaestro(serial, flow, 'inventory');
} else if (action === 'flow' && targetFlow) {
  const serial = requireDevice();
  requireInstalledApp(serial);
  const flow = path.resolve(projectRoot, targetFlow);
  runMaestro(serial, flow, path.basename(targetFlow, path.extname(targetFlow)));
} else if (action === 'suite') {
  const serial = requireDevice();
  requireInstalledApp(serial);
  const flowsPath = path.join(projectRoot, 'maestro', 'flows');
  runMaestro(serial, flowsPath, 'full-suite');
} else {
  fail(`Ação inválida "${action}". Use: check, build, start, smoke, inventory, flow <path>, ou suite.`);
}
