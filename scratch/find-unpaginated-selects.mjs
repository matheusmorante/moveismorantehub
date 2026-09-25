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
        // Match .from('...').select(...)
        const regex = /\.from\(['"](products|people|sales_orders|inventory_moves|purchase_orders|financial_transactions)['"]\)[\s\n]*\.select\(([\s\S]*?)\)[\s\S]*?(?:await|;|\.then)/g;
        let match;
        while ((match = regex.exec(c)) !== null) {
          const querySnippet = match[0];
          // Check if it's a select query (not followed by insert/update/delete)
          if (querySnippet.includes('.update(') || querySnippet.includes('.delete(') || querySnippet.includes('.insert(') || querySnippet.includes('.upsert(')) {
            continue;
          }
          const hasLimit = querySnippet.includes('.limit(') || querySnippet.includes('.range(');
          const hasSingle = querySnippet.includes('.single(') || querySnippet.includes('.maybeSingle(');
          const hasEqId = querySnippet.includes(".eq('id',") || querySnippet.includes('.eq("id",');
          const hasHeadOnly = querySnippet.includes('head: true');
          
          if (!hasLimit && !hasSingle && !hasEqId && !hasHeadOnly) {
            const upToMatch = c.substring(0, match.index);
            const lineNum = upToMatch.split('\n').length;
            list.push({
              file: p,
              line: lineNum,
              table: match[1],
              snippet: querySnippet.replace(/\s+/g, ' ').slice(0, 160)
            });
          }
        }
      }
    }
  }
  rec(dir);
  return list;
}

const unpaginatedSelects = searchFiles('erp/src').concat(searchFiles('mobile/src'));
console.log(`=== SELECTS SEM LIMIT/RANGE/SINGLE/ID EM TABELAS PESADAS: ${unpaginatedSelects.length} encontrados ===\n`);
for (const item of unpaginatedSelects) {
  console.log(`${item.file}:${item.line} [${item.table}] -> ${item.snippet}`);
}
