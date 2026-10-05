const { spawn } = require('node:child_process');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
require('./assert-vercel-development.cjs').assertVercelDevelopment();

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(executable, ['-y', 'vercel', 'dev', '--listen', '3000', '--yes'], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  windowsHide: true,
});

child.on('error', () => {
  process.stderr.write('Could not start Vercel Development.\n');
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code || 0;
});
