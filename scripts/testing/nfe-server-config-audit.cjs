// Read-only configuration diagnostics. Never prints values, tokens or certificates.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
const endpoint = `/v10/projects/${project.projectId}/env?decrypt=true&teamId=${project.orgId}`;
const response = spawnSync('npx.cmd', ['--yes', 'vercel', 'api', `"${endpoint}"`, '--raw'],
  { shell: true, windowsHide: true, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
if (response.status !== 0) throw new Error('Authorized Vercel configuration read failed.');
const data = JSON.parse(response.stdout);
for (const item of data.envs || []) {
  if (item.key !== 'NFE_ID_CSRT_HOMOLOGACAO' || !item.target?.includes('production')) continue;
  if (typeof item.value !== 'string') {
    console.log(JSON.stringify({ field: item.key, type: item.type, valueReadable: false }));
    continue;
  }
  const value = item.value;
  console.log(JSON.stringify({ field: item.key, type: item.type, valueReadable: true, length: value.length,
    twoDigits: /^\d{2}$/.test(value), oneDigit: /^\d$/.test(value),
    trimProducesTwoDigits: /^\d{2}$/.test(value.trim()), hasNewline: /[\r\n]/.test(value),
    placeholder: value === '[SENSITIVE]', hasBom: value.charCodeAt(0) === 0xfeff }));
}
