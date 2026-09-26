
const fs = require('fs');
const path = require('path');

const utilsDir = 'c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/utils/';
const testsDir = path.join(utilsDir, '__tests__');

if (!fs.existsSync(testsDir)) {
  fs.mkdirSync(testsDir, { recursive: true });
}

const files = fs.readdirSync(utilsDir);
const testFiles = files.filter(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx'));

let moved = 0;
for (const file of testFiles) {
  const oldPath = path.join(utilsDir, file);
  const newPath = path.join(testsDir, file);
  
  let content = fs.readFileSync(oldPath, 'utf8');
  content = content.replace(/from\s+['\u0022']\.\/(.*?)['\u0022']/g, 'from \'../\'');
  content = content.replace(/from\s+['\u0022']\.\.\/(.*?)['\u0022']/g, 'from \'../../\'');
  
  fs.writeFileSync(newPath, content, 'utf8');
  fs.unlinkSync(oldPath);
  moved++;
}
console.log('Moved ' + moved + ' files to ' + testsDir);

