const fs = require('fs');
const path = require('path');

const ROOT_DIRS = [
    path.resolve(__dirname, '../../erp/src'),
    path.resolve(__dirname, '../../mobile/src'),
];

function countLines(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.split('\n').length;
    } catch {
        return 0;
    }
}

function walkDir(dir, fileList = [], dirMap = {}) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const filesInThisDir = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!['node_modules', '.git', 'dist', 'build', '.expo'].includes(entry.name)) {
                    walkDir(fullPath, fileList, dirMap);
                }
            } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
                const lines = countLines(fullPath);
                fileList.push({ path: fullPath, lines, name: entry.name });
                filesInThisDir.push({ path: fullPath, name: entry.name, lines });
            }
        }
        if (filesInThisDir.length > 0) {
            dirMap[dir] = filesInThisDir;
        }
    } catch (e) {
        console.error('Erro ao ler dir:', dir, e.message);
    }
    return { fileList, dirMap };
}

const allFiles = [];
const allDirs = {};

for (const r of ROOT_DIRS) {
    if (fs.existsSync(r)) {
        walkDir(r, allFiles, allDirs);
    }
}

// 1. Top arquivos por linhas de código (candidatos a princípios de codificação)
allFiles.sort((a, b) => b.lines - a.lines);

// 2. Diretórios com muitos arquivos soltos no mesmo nível
const folderAudits = [];
for (const [dirPath, files] of Object.entries(allDirs)) {
    // Verificar se já tem subpastas semânticas ou se é uma pasta "flat" com muitos arquivos
    const relative = path.relative(path.resolve(__dirname, '../../'), dirPath).replace(/\\/g, '/');
    folderAudits.push({
        dir: relative,
        count: files.length,
        files: files.map(f => ({ name: f.name, lines: f.lines }))
    });
}
folderAudits.sort((a, b) => b.count - a.count);

console.log('=== TOP 60 ARQUIVOS MAIS EXTENSOS (CANDIDATOS A PRINCÍPIOS DE PROGRAMAÇÃO/SOLID) ===');
allFiles.slice(0, 65).forEach((f, idx) => {
    const rel = path.relative(path.resolve(__dirname, '../../'), f.path).replace(/\\/g, '/');
    console.log(`${idx + 1}. [${f.lines} linhas] ${rel}`);
});

console.log('\n=== TOP 20 PASTAS COM MAIOR NÚMERO DE ARQUIVOS SOLTOS (CANDIDATOS A ORGANIZAÇÃO EM SUBPASTAS) ===');
folderAudits.slice(0, 25).forEach((d, idx) => {
    console.log(`${idx + 1}. [${d.count} arquivos soltos] ${d.dir}`);
});

fs.writeFileSync(
    path.resolve(__dirname, 'audit_report.json'),
    JSON.stringify({ topFiles: allFiles.slice(0, 70), topDirs: folderAudits.slice(0, 30) }, null, 2)
);
