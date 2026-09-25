import fs from 'fs';
import path from 'path';

function searchFiles(dir) {
  const list = [];
  function rec(d) {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', '.git', 'dist', '.codex-finance-export-test', '.expo', 'build'].includes(f.name)) continue;
      const p = path.join(d, f.name);
      if (f.isDirectory()) rec(p);
      else if (f.name.endsWith('.ts') || f.name.endsWith('.tsx')) {
        const c = fs.readFileSync(p, 'utf8');
        // Look for supabase queries on products, people, sales_orders, inventory_moves
        // Extract multi-line statements matching .from('...') ... await or ;
        const regex = /\.from\(['"](products|people|sales_orders|inventory_moves|purchase_orders|financial_transactions)['"]\)[\s\S]*?(?:await|;|\.then)/g;
        let match;
        while ((match = regex.exec(c)) !== null) {
          const querySnippet = match[0];
          const hasLimit = querySnippet.includes('.limit(') || querySnippet.includes('.range(');
          const hasSingle = querySnippet.includes('.single(') || querySnippet.includes('.maybeSingle(');
          const hasHeadOnly = querySnippet.includes('head: true');
          const isCountOnly = querySnippet.includes("count: 'exact'") && hasHeadOnly;
          
          if (!hasLimit && !hasSingle && !isCountOnly) {
            // Find line number
            const upToMatch = c.substring(0, match.index);
            const lineNum = upToMatch.split('\n').length;
            list.push({
              file: p,
              line: lineNum,
              table: match[1],
              snippet: querySnippet.replace(/\s+/g, ' ').slice(0, 150)
            });
          }
        }
      }
    }
  }
  rec(dir);
  return list;
}

const unpaginated = searchFiles('erp/src').concat(searchFiles('mobile/src'));
console.log(`=== QUERIES SEM LIMIT/RANGE/SINGLE EM TABELAS PESADAS: ${unpaginated.length} encontradas ===\n`);
for (const item of unpaginated) {
  console.log(`${item.file}:${item.line} [${item.table}] -> ${item.snippet}`);
}
