import fs from 'fs';
import path from 'path';

function searchFiles(dir, pattern) {
  const list = [];
  function rec(d) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', '.git', 'dist', '.codex-finance-export-test', '.expo', 'build'].includes(f.name)) continue;
      const p = path.join(d, f.name);
      if (f.isDirectory()) rec(p);
      else if (f.name.endsWith('.ts') || f.name.endsWith('.tsx')) {
        const c = fs.readFileSync(p, 'utf8');
        const lines = c.split('\n');
        lines.forEach((l, idx) => {
          if (pattern.test(l)) {
            list.push({ file: p, line: idx + 1, text: l.trim() });
          }
        });
      }
    }
  }
  rec(dir);
  return list;
}

console.log('=== 1. SELECT * ON HEAVY TABLES (products, people, inventory_moves, sales_orders) ===');
const heavySelect = searchFiles('erp/src', /\.from\(['"](products|people|inventory_moves|sales_orders)['"]\)\s*\.select\(['"]\*['"]\)/)
  .concat(searchFiles('mobile/src', /\.from\(['"](products|people|inventory_moves|sales_orders)['"]\)\s*\.select\(['"]\*['"]\)/));
heavySelect.forEach(h => console.log(`${h.file}:${h.line} -> ${h.text}`));

console.log('\n=== 2. QUERIES WITHOUT RANGE OR LIMIT (POTENTIAL FULL TABLE DOWNLOAD) ===');
// Find queries selecting from heavy tables that do NOT have range or limit
const allFromHeavy = searchFiles('erp/src', /\.from\(['"](products|people|inventory_moves|sales_orders)['"]\)/)
  .concat(searchFiles('mobile/src', /\.from\(['"](products|people|inventory_moves|sales_orders)['"]\)/));
console.log(`Total queries touching heavy tables: ${allFromHeavy.length}`);

console.log('\n=== 3. SEARCHING FOR clear...Cache OR invalidate IN THE CODEBASE ===');
const cacheClears = searchFiles('erp/src', /clear.*Cache|invalidate.*Cache/)
  .concat(searchFiles('mobile/src', /clear.*Cache|invalidate.*Cache/));
cacheClears.forEach(c => console.log(`${c.file}:${c.line} -> ${c.text}`));
