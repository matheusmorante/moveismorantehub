const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const projectRoot = process.platform === 'win32' && fs.existsSync('C:\\Users\\mathe\\morantehub-build')
  ? 'C:\\Users\\mathe\\morantehub-build'
  : path.resolve(__dirname, '..');
const vercelCliCwd = path.join(projectRoot, '.vercel');
require('./assert-vercel-development.cjs').assertVercelDevelopment();

const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library/Application Support') : path.join(process.env.HOME || '', '.config'));
const vercelAuthPath = path.join(appData, 'com.vercel.cli/auth.json');
const hasVercelAuth = Boolean(process.env.VERCEL_TOKEN || (fs.existsSync(vercelAuthPath) && JSON.parse(fs.readFileSync(vercelAuthPath, 'utf8') || '{}').token));

if (!hasVercelAuth || process.env.VERCEL_USE_STANDALONE === '1' || process.env.USE_LOCAL_API_SERVER === '1') {
  console.log('[run-vercel-dev] Vercel CLI sem credenciais de runtime. Iniciando local-fiscal-dev-server na porta 3000...');
  require('./local-fiscal-dev-server.cjs').start();
} else {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const env = { ...process.env };
  const child = spawn(executable, ['-y', 'vercel', 'dev', '--listen', '3000', '--yes'], {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    windowsHide: true,
  });

  child.on('error', () => {
    console.log('[run-vercel-dev] Fallback para local-fiscal-dev-server...');
    require('./local-fiscal-dev-server.cjs').start();
  });
  child.on('exit', (code, signal) => {
    if (code !== 0) {
      console.log('[run-vercel-dev] Vercel CLI indisponível. Iniciando local-fiscal-dev-server na porta 3000...');
      require('./local-fiscal-dev-server.cjs').start();
    } else if (signal) {
      process.kill(process.pid, signal);
    }
  });
}
