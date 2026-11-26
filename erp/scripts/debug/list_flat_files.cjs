const fs = require('fs');
const path = require('path');

function list(dir) {
  const full = path.resolve(__dirname, '../', dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full, { withFileTypes: true })
    .filter(d => !d.isDirectory() && /\.(tsx|ts)$/.test(d.name))
    .map(d => d.name);
}

console.log('--- SalesOrder raiz (' + list('src/pages/App/SalesOrder').length + ') ---');
console.log(JSON.stringify(list('src/pages/App/SalesOrder'), null, 2));

console.log('--- utils raiz (' + list('src/pages/utils').length + ') ---');
console.log(JSON.stringify(list('src/pages/utils'), null, 2));

console.log('--- Settings/components raiz (' + list('src/pages/App/Settings/components').length + ') ---');
console.log(JSON.stringify(list('src/pages/App/Settings/components'), null, 2));
