const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== 'build') {
                getFiles(fullPath, fileList);
            }
        } else if (entry.isFile()) {
            if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
                !entry.name.includes('.test.') && !entry.name.includes('.spec.') && !entry.name.endsWith('.d.ts')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\n').length;
                fileList.push({ file: path.relative(process.cwd(), fullPath), lines });
            }
        }
    }
    return fileList;
}

const erpFiles = getFiles(path.resolve('erp/src'));
const mobileFiles = getFiles(path.resolve('mobile/src'));
const all = [...erpFiles, ...mobileFiles].sort((a, b) => b.lines - a.lines);

console.log('TOP 25 MAIORES ARQUIVOS:');
all.slice(0, 25).forEach((f, i) => console.log(`${i + 1}. [${f.lines} linhas] ${f.file}`));
