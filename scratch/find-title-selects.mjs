import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('erp/src');
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes("from('products')") || content.includes('from("products")')) {
    if (content.includes('title')) {
      const regex = /\.from\(['"]products['"]\)[\s\S]*?\.select\([\s\S]*?title[\s\S]*?\)/g;
      const matches = content.match(regex);
      if (matches) {
        console.log('Arquivo encontrado:', f);
        matches.forEach(m => console.log('--- Match:', m.slice(0, 150)));
      }
    }
  }
}
