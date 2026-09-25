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

console.log('=== ORDERS IN MOBILE ===');
const mobileOrders = searchFiles('mobile/src', /\.from\(['"]orders['"]\)/);
mobileOrders.forEach(m => console.log(`${m.file}:${m.line} ${m.text}`));

console.log('\n=== REALTIME ON ORDERS IN ERP ===');
const erpRealtime = searchFiles('erp/src', /postgres_changes/);
erpRealtime.forEach(m => console.log(`${m.file}:${m.line} ${m.text}`));
