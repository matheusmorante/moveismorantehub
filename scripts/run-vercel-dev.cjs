const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const projectRoot = process.platform === 'win32' && fs.existsSync('C:\\Users\\mathe\\morantehub-build')
  ? 'C:\\Users\\mathe\\morantehub-build'
  : path.resolve(__dirname, '..');
const vercelCliCwd = path.join(projectRoot, '.vercel');
require('./assert-vercel-development.cjs').assertVercelDevelopment();

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
  process.stderr.write('Could not start Vercel Development.\n');
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code || 0;
});
