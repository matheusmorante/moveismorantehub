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
const smokeFlow = path.join(projectRoot, 'maestro', 'flows', 'smoke', 'app-launch.yaml');
const resultsDir = path.join(os.tmpdir(), 'morante-maestro-results');

function fail(message, code = 1) {
  console.error(`\n[mobile-device] ${message}`);
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

  const unauthorized = rows.find(row => row.state === 'unauthorized');
  if (unauthorized) {
    fail(`O aparelho ${unauthorized.serial} está unauthorized. Desbloqueie o telefone e aceite “Permitir depuração USB?”; marque “Sempre permitir deste computador”.`, 2);
  }

  const offline = rows.find(row => row.state === 'offline');
  if (offline) fail(`O aparelho ${offline.serial} está offline no ADB. Reconecte o USB e reinicie a depuração USB.`, 2);

  let devices = rows.filter(row => row.state === 'device');
  if (process.env.ANDROID_SERIAL) {
    devices = devices.filter(row => row.serial === process.env.ANDROID_SERIAL);
  }
  if (devices.length === 0) {
    fail('AGUARDANDO_DISPOSITIVO_FISICO: adb devices -l não listou aparelho autorizado. Confira cabo de dados, modo USB, depuração e driver OEM; este fluxo não inicia emulador.', 2);
  }
  if (devices.length > 1) {
    fail(`Há ${devices.length} aparelhos autorizados. Defina ANDROID_SERIAL com o serial do celular USB desejado; nenhum alvo foi escolhido automaticamente.`, 2);
  }

  const device = devices[0];
  if (/^emulator-/i.test(device.serial)) {
    fail('Alvo recusado: esta configuração permite somente celular físico USB, nunca emulador/AVD.', 2);
  }
  if (/[.:]\d+$/.test(device.serial)) {
    fail(`O alvo ${device.serial} parece ser uma conexão ADB de rede; somente USB físico é permitido.`, 2);
  }

  const qemu = capture(adbPath, ['-s', device.serial, 'shell', 'getprop', 'ro.kernel.qemu']);
  if (qemu === '1') fail('Alvo recusado: o dispositivo informou ro.kernel.qemu=1; somente celular físico é permitido.', 2);

  // Some Windows ADB builds omit the `usb:` detail even for a USB-connected phone.
  // In that case require Windows to enumerate exactly one present USB ADB interface.
  if (!/\busb:/i.test(device.details)) {
    if (process.platform !== 'win32') {
      fail(`O ADB não confirmou transporte USB físico (detalhes: ${device.details || 'ausentes'}). AVD e depuração Wi-Fi não são aceitos nesta suíte.`, 2);
    }

    const pnpScript = "$items = @(Get-PnpDevice -PresentOnly | Where-Object { $_.Class -eq 'USBDevice' -and $_.FriendlyName -match 'ADB|Android.*Interface' }); if ($items.Count -ne 1) { exit 3 }; $items[0].InstanceId";
    const pnpCommand = Buffer.from(pnpScript, 'utf16le').toString('base64');
    const pnpCheck = spawnSync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      pnpCommand,
    ], { encoding: 'utf8', timeout: 20_000, windowsHide: true });
    const usbAdbInterface = pnpCheck.stdout?.trim() || '';
    if (pnpCheck.error || pnpCheck.status !== 0 || !/^USB\\VID_[0-9A-F]{4}&PID_[0-9A-F]{4}/i.test(usbAdbInterface)) {
      fail(`O ADB não expôs usb: e o Windows não confirmou exatamente uma interface ADB USB física (detalhes ADB: ${device.details || 'ausentes'}). AVD e depuração Wi-Fi não são aceitos nesta suíte.`, 2);
    }
  }

  console.log(`[mobile-device] Aparelho físico autorizado via USB: ${device.serial}${/\busb:/i.test(device.details) ? '' : ' (USB confirmado pelo Windows PnP)'}`);
  return device.serial;
}

function requireInstalledApp(serial) {
  const result = spawnSync(adbPath, ['-s', serial, 'shell', 'pm', 'path', appId], {
    encoding: 'utf8',
    timeout: 20_000,
  });
  if (result.status !== 0 || !result.stdout?.includes('package:')) {
    fail(`App ${appId} não está instalado. Execute “npm run test:mobile:build” primeiro.`);
  }
}

function runMaestro(serial, flowPath, label) {
  if (!existsSync(maestroPath)) fail(`Maestro CLI não encontrado em ${maestroPath}. Configure MAESTRO_CLI ou instale a CLI oficial.`);
  if (!existsSync(flowPath)) fail(`Flow não encontrado: ${flowPath}`);

  mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(resultsDir, `${label}-${timestamp}.xml`);
  console.log(`[mobile-device] Relatório JUnit: ${reportPath}`);
  run(maestroPath, [
    `--device=${serial}`,
    'test',
    '--format=JUNIT',
    `--output=${reportPath}`,
    `--test-output-dir=${resultsDir}`,
    flowPath,
  ]);
}

const action = process.argv[2] || 'check';
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
} else if (action === 'smoke' || action === 'suite') {
  const serial = requireDevice();
  requireInstalledApp(serial);
  const flowsPath = action === 'smoke'
    ? smokeFlow
    : path.join(projectRoot, 'maestro', 'flows');
  runMaestro(serial, flowsPath, action);
} else {
  fail(`Ação inválida “${action}”. Use check, build, start, smoke ou suite.`);
}
