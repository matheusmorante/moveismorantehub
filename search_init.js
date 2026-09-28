const fs = require('fs');
const path = require('path');

function walk(dir, ext) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file, ext));
        } else if (file.endsWith(ext) || file.endsWith('.tsx') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = [...walk('erp/src', '.ts'), ...walk('erp/src', '.tsx')];
const regex = /initializeProductsIfEmpty/;

const matches = [];
files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    if (regex.test(content)) {
        matches.push(f);
    }
});
console.log(matches.join('\n'));